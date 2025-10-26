import fetch from "node-fetch";
import { keypairFromEnv, transferUSDC } from "@pandorax402/shared";
import { PublicKey } from "@solana/web3.js";
import { env } from "./env.js";

const me = keypairFromEnv(env.AGENT_SECRET_KEY);
const USDC_MINT = new PublicKey(env.USDC_MINT);

async function j(r: Response) { return await r.json().catch(() => ({})); }
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function earn() {
  const r = await fetch(`${env.JOBS}/tasks`); const d = await j(r);
  const open = (d.tasks || []).find((t: any)=> t.status==="open");
  if (!open) return null;
  await fetch(`${env.JOBS}/tasks/${open.id}/claim`, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ agent: me.publicKey.toBase58() }) });
  await sleep(1000);
  const done = await fetch(`${env.JOBS}/tasks/${open.id}/complete`, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify({ agent: me.publicKey.toBase58() }) });
  const out = await j(done);
  console.log("Earned USDC. wageTx:", out.signature);
  return out;
}

async function getFoodMenu() {
  const quoteReq = {
    resource: "food/menu",
    currency: "USDC",
    priceBaseUnits: "100000",
    payTo: "MERCHANT_WALLET_REPLACE",
    mint: USDC_MINT.toBase58()
  };
  const q = await fetch(`${env.WEB_GATEWAY}/x402/quote`, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(quoteReq) });
  if (q.status !== 402) { console.warn("Expected 402, got", q.status); return; }
  const quote = await j(q);
  const sig = await transferUSDC(me, new PublicKey(quote.payTo), new PublicKey(quote.mint), BigInt(quote.priceBaseUnits));
  console.log("Paid 402 USDC. sig:", sig);
  const verify = await fetch(`${env.WEB_GATEWAY}/x402/proxy`, {
    method: "POST", headers: { "content-type":"application/json" },
    body: JSON.stringify({ signature: sig, quote, forward: { method: "GET", url: `${env.MERCHANT_BASE}/food/menu` } })
  });
  const resp = await j(verify);
  console.log("Menu:", verify.status, resp);
}

async function main() {
  console.log("Agent:", me.publicKey.toBase58());
  while (true) {
    await earn();
    await sleep(1500);
    await getFoodMenu();
    await sleep(3000);
  }
}
main();
