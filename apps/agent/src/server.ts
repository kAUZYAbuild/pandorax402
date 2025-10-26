import express from "express";
import cors from "cors";
import morgan from "morgan";
import { keypairFromEnv, transferUSDC } from "@pandorax402/shared";
import { PublicKey } from "@solana/web3.js";
import { env } from "./env.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

const me = keypairFromEnv(env.AGENT_SECRET_KEY);

app.post("/pay", async (req, res) => {
  try {
    const quote = req.body?.quote;
    if (!quote || !quote.mint || !quote.payTo || !quote.priceBaseUnits) {
      return res.status(400).json({ error: "invalid quote" });
    }
    const sig = await transferUSDC(
      me,
      new PublicKey(quote.payTo),
      new PublicKey(quote.mint),
      BigInt(quote.priceBaseUnits)
    );
    return res.json({ signature: sig, payer: me.publicKey.toBase58() });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "pay failed" });
  }
});

const PORT = process.env.PORT || 4010;
app.listen(PORT, () => console.log(`agent pay-server on :${PORT}`));
