export const env = {
  WEB_GATEWAY: process.env.WEB_GATEWAY || "http://localhost:4000",
  MERCHANT_BASE: process.env.MERCHANT_BASE || "http://localhost:4002",
  JOBS: process.env.JOBS || "http://localhost:4001",
  AGENT_SECRET_KEY: process.env.AGENT_SECRET_KEY!,
  USDC_MINT: process.env.USDC_MINT!,
  MERCHANT_WALLET: process.env.MERCHANT_WALLET || "MERCHANT_WALLET_REPLACE",
};
