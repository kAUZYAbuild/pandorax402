export const env = {
  PORT: parseInt(process.env.PORT || "4001", 10),
  DATABASE_URL: process.env.DATABASE_URL || "postgresql://app:app@localhost:5432/llmcity?schema=public",
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  EMPLOYER_SECRET_KEY: process.env.EMPLOYER_SECRET_KEY!,
  USDC_MINT: process.env.USDC_MINT!,
};
