import express from "express";
import morgan from "morgan";
import cors from "cors";
import { OpenAI } from "openai";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CONVOS = process.env.CONVERSATIONS_BASE || "http://localhost:4015";
const GATEWAY = process.env.GATEWAY_BASE || "http://localhost:4000";
const MERCHANT_WALLET = process.env.MERCHANT_WALLET || "MERCHANT_WALLET_REPLACE";
const USDC_MINT = process.env.USDC_MINT || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

async function logMsg(convoId: string, role: string, text: string, meta: any = {}, scenario="food") {
  await fetch(`${CONVOS}/messages`, {
    method: "POST", headers: { "content-type":"application/json" },
    body: JSON.stringify({ role, text, meta, convoId, scenario })
  }).catch(()=>{});
}

app.post("/negotiate", async (req, res) => {
  try {
    const { convoId, userMsg, scenario="food" } = req.body || {};
    const sys = `You are a merchant bot. Sell fairly. Counter once if price is too low. For food, baseline is 0.70 USDC; accept >=0.55 USDC. For a 30m meeting, baseline 2.10 USDC; accept >=1.60.`;
    const chat = await oai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userMsg }
      ],
      temperature: 0.4
    });
    const text = chat.choices[0]?.message?.content || "I can do 0.60 USDC.";
    await logMsg(convoId, "seller", text, {}, scenario);
    res.json({ reply: text });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "negotiation failed" });
  }
});

app.post("/quote", async (req, res) => {
  try {
    const { convoId, scenario="food", baseUnits } = req.body || {};
    const resource = scenario === "food" ? "food/menu" : "meetings/book?duration=30";
    const q = await fetch(`${GATEWAY}/x402/quote`, {
      method:"POST", headers: { "content-type":"application/json" },
      body: JSON.stringify({
        resource,
        currency: "USDC",
        priceBaseUnits: String(baseUnits),
        payTo: MERCHANT_WALLET,
        mint: USDC_MINT
      })
    });
    const payload = await q.json().catch(()=>({}));
    await logMsg(convoId, "gateway", "Issued quote (402).", { quote: payload }, scenario);
    res.status(q.status).json(payload);
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "quote failed" });
  }
});

const PORT = process.env.PORT || 4012;
app.listen(PORT, () => console.log(`merchant-bot on :${PORT}`));
