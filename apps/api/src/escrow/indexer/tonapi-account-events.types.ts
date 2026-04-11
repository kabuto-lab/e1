/**
 * Минимальные типы ответа TonAPI GET /v2/accounts/{account_id}/events
 * (см. opentonapi openapi Action / JettonTransferAction).
 */

export interface TonJettonPreview {
  address: string;
  decimals?: number;
}

export interface TonAccountAddress {
  address: string;
}

export interface TonJettonTransferBody {
  amount: string;
  comment?: string;
  jetton: TonJettonPreview;
  recipient: TonAccountAddress;
  sender: TonAccountAddress;
}

export interface TonFlawedJettonTransferBody {
  sent_amount: string;
  received_amount: string;
  comment?: string;
  jetton: TonJettonPreview;
  recipient: TonAccountAddress;
  sender: TonAccountAddress;
}

export interface TonAction {
  type: string;
  status: string;
  base_transactions?: string[];
  JettonTransfer?: TonJettonTransferBody;
  FlawedJettonTransfer?: TonFlawedJettonTransferBody;
}

export interface TonAccountEvent {
  event_id: string;
  lt: number | string;
  timestamp: number;
  actions: TonAction[];
  in_progress?: boolean;
  is_scam?: boolean;
}

export interface TonAccountEventsResponse {
  events: TonAccountEvent[];
  next_from?: number | string;
}
