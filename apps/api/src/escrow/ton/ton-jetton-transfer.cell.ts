/**
 * TEP-74 jetton transfer message (тело internal message на jetton-wallet отправителя).
 * @see https://github.com/ton-blockchain/TEPs/blob/master/text/0074-jettons-standard.md
 */

import { beginCell, type Address, type Cell } from '@ton/core';

const JETTON_TRANSFER_OP = 0x0f8a7ea5;

export function buildJettonTransferBody(params: {
  jettonAmount: bigint;
  /** Jetton-wallet получателя (не owner address). */
  destinationJettonWallet: Address;
  /** Куда вернуть excess TON (обычно owner / treasury wallet). */
  responseDestination: Address;
  forwardTonAmount: bigint;
  forwardComment?: string;
}): Cell {
  const b = beginCell()
    .storeUint(JETTON_TRANSFER_OP, 32)
    .storeUint(0n, 64)
    .storeCoins(params.jettonAmount)
    .storeAddress(params.destinationJettonWallet)
    .storeAddress(params.responseDestination)
    .storeBit(0)
    .storeCoins(params.forwardTonAmount);

  const comment = params.forwardComment?.trim();
  if (comment && params.forwardTonAmount > 0n) {
    const forwardPayload = beginCell().storeUint(0, 32).storeStringTail(comment).endCell();
    b.storeBit(1).storeRef(forwardPayload);
  } else {
    b.storeBit(0);
  }

  return b.endCell();
}
