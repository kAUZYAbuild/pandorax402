import { OpenAI } from "openai";
import fetch from "node-fetch";

const oai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const CONVOS = process.env.CONVERSATIONS_BASE || "http://localhost:4015";
const MERCHANT = process.env.MERCHANT_BOT_BASE || "http://localhost:4012";
const AGENTPAY = process.env.AGENT_PAY_BASE || "http://localhost:4010";
const GATEWAY = process.env.GATEWAY_BASE || "http://localhost:4000";
const SCENARIO = process.env.SCENARIO || "food";
const TARGET = BigInt(process.env.TARGET_PRICE_BASE || "550000");

async function log(role: string, text: string, meta: any, convoId: string) {
  await fetch(`${CONVOS}/messages`, {
    method: "POST", headers: { "content-type":"application/json" },
    body: JSON.stringify({ role, text, meta, convoId, scenario: SCENARIO })
  }).catch(()=>{});
}

async function main() {
  try {
    const convoId = Math.random().toString(36).slice(2);
    await log("buyer", "Hello! I'm looking for your service. What's your price?", {}, convoId);

    // Negotiate with merchant
    const firstRes = await fetch(`${MERCHANT}/negotiate`, {
      method:"POST", headers: { "content-type":"application/json" },
      body: JSON.stringify({ convoId, userMsg: "I need one unit today. Can you quote?", scenario: SCENARIO })
    }).catch((err: any) => { throw new Error(`Negotiate failed: ${err}`); });
    if (!firstRes.ok) throw new Error(`Negotiate returned status ${firstRes.status}`);
    const first = await firstRes.json().catch(() => ({ reply: "I can do 0.60 USDC." }));
    await log("seller", first.reply, {}, convoId);

    // Generate counter-offer using AI
    const sys = `You are an agent trying to save money but be fair. Propose a counter offer in base units for USDC with 6 decimals. Return only a number.`;
    const cc = await oai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: `Seller says: "${first.reply}". Baseline target is ${TARGET}.` }
      ],
      temperature: 0.2
    }).catch((err: any) => { throw new Error(`OpenAI API failed: ${err}`); });
    const suggested = cc.choices[0]?.message?.content?.replace(/[^0-9]/g,"") || String(TARGET);
    const askBase = BigInt(suggested || TARGET.toString());
    await log("buyer", `I can do ${(Number(askBase)/1_000_000).toFixed(2)} USDC.`, { askBase: String(askBase) }, convoId);

    // Get quote from merchant
    const baseUnits = String(askBase);
    const q = await fetch(`${MERCHANT}/quote`, {
      method:"POST", headers: { "content-type":"application/json" },
      body: JSON.stringify({ convoId, scenario: SCENARIO, baseUnits })
    }).catch((err: any) => { throw new Error(`Quote fetch failed: ${err}`); });
    const quote = await q.json().catch(() => ({}));
    await log("gateway", "Quote issued.", { quote }, convoId);
    if (q.status !== 402) throw new Error(`Expected 402 quote, got ${q.status}`);

    // Pay the merchant
    const payRes = await fetch(`${AGENTPAY}/pay`, {
      method:"POST", headers: { "content-type":"application/json" },
      body: JSON.stringify({ quote })
    }).catch((err: any) => { throw new Error(`Payment fetch failed: ${err}`); });
    if (!payRes.ok) throw new Error(`Payment returned status ${payRes.status}`);
    const pay = await payRes.json().catch(() => ({}));
    if (!pay?.signature) throw new Error("Pay failed: no signature returned");
    await log("buyer", `Paid. Signature: ${pay.signature}`, {}, convoId);

    // Verify payment and forward to merchant
    const forwardUrl = SCENARIO === "food" ? "http://localhost:4002/food/menu" : "http://localhost:4002/tools/linter";
    const verify = await fetch(`${GATEWAY}/x402/proxy`, {
      method:"POST", headers: { "content-type":"application/json" },
      body: JSON.stringify({ signature: pay.signature, quote, forward: { method:"GET", url: forwardUrl } })
    }).catch((err: any) => { throw new Error(`Verify fetch failed: ${err}`); });
    const body = await verify.json().catch(()=>({}));
    await log("gateway", `Verify status ${verify.status}`, { body }, convoId);

    console.log("Conversation complete:", convoId, "verify:", verify.status);
  } catch (e: any) {
    console.error("Agent bot error:", e);
    process.exit(1);
  }
}
main().catch(e => { console.error(e); process.exit(1); });
