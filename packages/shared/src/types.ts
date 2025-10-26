export type Chain = "solana-devnet";
export type Currency = "USDC" | "SOL";
export type X402Quote = {
  code: 402;
  reason: "Payment Required";
  chain: Chain;
  currency: Currency;
  price: string;
  priceBaseUnits: string;
  mint?: string;
  payTo: string;
  recipientTokenAccount?: string;
  resource: string;
  nonce: string;
};

export type Receipt = {
  resource: string;
  signature: string;
  amountBaseUnits: string;
  currency: Currency;
  payTo: string;
  ts: number;
  receiptHash: string;
};

export type TalkTurn = {
  role: "buyer" | "seller" | "gateway";
  text: string;
  ts: string;
  meta?: Record<string, any>;
};
