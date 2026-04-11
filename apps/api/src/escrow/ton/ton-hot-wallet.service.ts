/**
 * Подпись и отправка jetton transfer с hot wallet (mnemonic).
 * Адрес кошелька V4 должен совпадать с TON_TREASURY_ADDRESS.
 */

import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address, internal, type OpenedContract } from '@ton/core';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { JettonMaster, TonClient, WalletContractV4 } from '@ton/ton';
import type { EscrowTonNetwork } from '@escort/db';
import { TonAddress } from '../domain/value-objects/ton-address.vo';
import { buildJettonTransferBody } from './ton-jetton-transfer.cell';

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function parsePositiveBigIntEnv(raw: string | undefined, fallback: string): bigint {
  const s = (raw ?? fallback).trim();
  if (!/^\d+$/.test(s)) {
    return BigInt(fallback);
  }
  return BigInt(s);
}

@Injectable()
export class TonHotWalletService {
  private readonly logger = new Logger(TonHotWalletService.name);
  private client: TonClient | null = null;
  private wallet: WalletContractV4 | null = null;
  private secretKey: Buffer | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly config: ConfigService) {}

  private getDefaultRpcEndpoint(network: EscrowTonNetwork | undefined): string {
    if (network === 'ton_testnet') {
      return 'https://testnet.toncenter.com/api/v2/jsonRPC';
    }
    return 'https://toncenter.com/api/v2/jsonRPC';
  }

  private async ensureReady(): Promise<void> {
    if (this.client && this.wallet && this.secretKey) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      const mnemonicRaw = this.config.get<string>('TON_HOT_WALLET_MNEMONIC');
      if (!mnemonicRaw?.trim()) {
        throw new ServiceUnavailableException(
          'Hot wallet broadcast disabled (set TON_HOT_WALLET_MNEMONIC)',
        );
      }

      const words = mnemonicRaw.trim().split(/\s+/);
      if (words.length < 12) {
        throw new BadRequestException('TON_HOT_WALLET_MNEMONIC must be a valid mnemonic phrase');
      }

      const treasuryStr = this.config.get<string>('TON_TREASURY_ADDRESS')?.trim();
      const masterStr = this.config.get<string>('TON_USDT_JETTON_MASTER')?.trim();
      const network = this.config.get<EscrowTonNetwork | undefined>('TON_NETWORK');

      if (!treasuryStr || !masterStr || !network) {
        throw new ServiceUnavailableException(
          'TON_TREASURY_ADDRESS, TON_USDT_JETTON_MASTER and TON_NETWORK are required for broadcast',
        );
      }

      const { publicKey, secretKey } = await mnemonicToPrivateKey(words);
      this.secretKey = secretKey;
      this.wallet = WalletContractV4.create({ workchain: 0, publicKey });

      const treasuryAddr = Address.parse(TonAddress.parse(treasuryStr).toString());
      if (!this.wallet.address.equals(treasuryAddr)) {
        throw new BadRequestException(
          'TON_HOT_WALLET_MNEMONIC does not derive TON_TREASURY_ADDRESS (WalletContract v4R2, workchain 0)',
        );
      }

      const endpointRaw = this.config.get<string>('TON_RPC_ENDPOINT')?.trim();
      const endpoint = endpointRaw || this.getDefaultRpcEndpoint(network);
      const apiKey = this.config.get<string>('TON_RPC_API_KEY')?.trim();

      this.client = new TonClient({
        endpoint,
        apiKey: apiKey || undefined,
      });
    })();

    try {
      await this.initPromise;
    } catch (e) {
      this.initPromise = null;
      throw e;
    }
  }

  /**
   * Отправить jetton с treasury jetton-wallet на jetton-wallet владельца recipientOwnerAddress.
   * @returns hex-хеш последней исходящей транзакции кошелька (для записи в release/refund_tx_hash).
   */
  async transferJettonToOwner(params: {
    recipientOwnerAddress: string;
    jettonAmountAtomic: bigint;
    forwardComment?: string;
  }): Promise<string> {
    if (params.jettonAmountAtomic <= 0n) {
      throw new BadRequestException('jettonAmountAtomic must be positive');
    }

    await this.ensureReady();

    const client = this.client!;
    const wallet = this.wallet!;
    const secretKey = this.secretKey!;

    const masterStr = this.config.get<string>('TON_USDT_JETTON_MASTER')!.trim();
    const master = Address.parse(TonAddress.parse(masterStr).toString());
    const recipientOwner = Address.parse(TonAddress.parse(params.recipientOwnerAddress).toString());

    const masterContract = client.open(JettonMaster.create(master));
    const fromJettonWallet = await masterContract.getWalletAddress(wallet.address);
    const toJettonWallet = await masterContract.getWalletAddress(recipientOwner);

    const gasAttached = parsePositiveBigIntEnv(
      this.config.get<string>('TON_JETTON_GAS_NANOTONS'),
      '150000000',
    );
    const forwardTon = parsePositiveBigIntEnv(
      this.config.get<string>('TON_JETTON_FORWARD_NANOTONS'),
      '50000000',
    );

    const comment =
      params.forwardComment != null && params.forwardComment.length > 0
        ? params.forwardComment.slice(0, 100)
        : undefined;

    const body = buildJettonTransferBody({
      jettonAmount: params.jettonAmountAtomic,
      destinationJettonWallet: toJettonWallet,
      responseDestination: wallet.address,
      forwardTonAmount: forwardTon,
      forwardComment: comment,
    });

    const walletContract = client.open(wallet);
    const seqno = await walletContract.getSeqno();

    await walletContract.sendTransfer({
      seqno,
      secretKey,
      messages: [
        internal({
          to: fromJettonWallet,
          value: gasAttached,
          bounce: true,
          body,
        }),
      ],
    });

    await this.waitSeqnoIncrease(walletContract, seqno);
    await sleep(1500);

    const txs = await client.getTransactions(wallet.address, { limit: 3 });
    if (!txs.length) {
      throw new Error('No transactions returned after broadcast');
    }
    const hashHex = txs[0].hash().toString('hex');
    this.logger.log(`Jetton transfer broadcast, wallet tx hash (hex)=${hashHex.slice(0, 24)}…`);
    return hashHex;
  }

  private async waitSeqnoIncrease(
    walletContract: OpenedContract<WalletContractV4>,
    prevSeqno: number,
  ): Promise<void> {
    for (let i = 0; i < 45; i++) {
      await sleep(1000);
      try {
        const s = await walletContract.getSeqno();
        if (s > prevSeqno) {
          return;
        }
      } catch {
        /* retry */
      }
    }
    throw new Error('Timeout waiting for wallet seqno increment (transaction may still confirm)');
  }
}
