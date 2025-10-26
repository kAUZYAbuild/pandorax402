import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import { X402Quote, sha256, verifyUSDC, verifySOL } from "@pandorax402/shared";
import { PublicKey } from "@solana/web3.js";
import { z } from "zod";
import fetch from "node-fetch";
import { debugRouter } from "./debug.js";

const prisma = new PrismaClient();
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

const QuoteReq = z.object({
  resource: z.string(),
  currency: z.enum(["USDC","SOL"]),
  priceBaseUnits: z.string(),
  payTo: z.string(),
  mint: z.string().optional(),
  recipientTokenAccount: z.string().optional()
});

function cryptoRandom() {
  return Array.from({length: 8}, () => Math.floor(Math.random()*256)
  .toString(16).padStart(2,"0")).join("");
}

app.post("/x402/quote", async (req, res) => {
  const parsed = QuoteReq.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  const { resource, currency, priceBaseUnits, payTo, mint, recipientTokenAccount } = parsed.data;
  const quote: X402Quote = {
    code: 402,
    reason: "Payment Required",
    chain: "solana-devnet",
    currency,
    price: "",
    priceBaseUnits,
    mint,
    payTo,
    recipientTokenAccount,
    resource,
    nonce: cryptoRandom()
  };
  res.status(402).json(quote);
});

app.post("/x402/verify", async (req, res) => {
  const { signature, quote } = req.body as { signature: string; quote: X402Quote };
  if (!signature || !quote) return res.status(400).json({ error: "Missing signature or quote" });

  const already = await prisma.consumedSignature.findUnique({
    where: { signature_resource: { signature, resource: quote.resource } }
  }).catch(() => null as any);
  if (already) return res.status(200).json({ ok: true, idempotent: true });

  try {
    let ok = false;
    if (quote.currency === "USDC") {
      if (!quote.mint) return res.status(400).json({ error: "USDC mint missing" });
      const delta = await verifyUSDC({
        signature,
        recipientOwner: new PublicKey(quote.payTo),
        mint: new PublicKey(quote.mint),
        minAmount: BigInt(quote.priceBaseUnits)
      });
      ok = !!delta;
    } else {
      const delta = await verifySOL(signature, new PublicKey(quote.payTo), BigInt(quote.priceBaseUnits));
      ok = !!delta;
    }
    if (!ok) return res.status(402).json({ ok: false, error: "Insufficient or invalid payment" });

    await prisma.consumedSignature.create({ data: { signature, resource: quote.resource } });
    await prisma.payment.create({
      data: {
        signature,
        currency: quote.currency,
        amountBase: quote.priceBaseUnits,
        payTo: quote.payTo,
        resource: quote.resource,
        quote,
        verifiedAt: new Date()
      }
    });
    const receiptHash = sha256(JSON.stringify(quote) + signature);
    await prisma.receipt.create({ data: { signature, resource: quote.resource, receiptHash, payload: { quote, signature } } });
    return res.status(200).json({ ok: true, receiptHash });
  } catch (e:any) {
    return res.status(500).json({ error: e?.message || "verify error" });
  }
});

app.post("/x402/proxy", async (req, res) => {
  const { signature, quote, forward } = req.body as { signature: string; quote: X402Quote; forward: { method: string; url: string; body?: any; headers?: any } };
  const v = await fetch(`http://localhost:4000/x402/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ signature, quote }) });
  const ok = v.status === 200;
  if (!ok) {
    const body = await v.json().catch(() => ({}));
    return res.status(402).json(body);
  }
  const f = await fetch(forward.url, {
    method: forward.method || "GET",
    headers: { "content-type": "application/json", ...(forward.headers || {}) },
    body: forward.body ? JSON.stringify(forward.body) : undefined
  });
  const payload = await f.json().catch(() => ({}));
  return res.status(f.status).json(payload);
});

app.use(debugRouter);
app.get("/healthz", (_req, res) => res.json({ ok: true }));
app.listen(process.env.PORT || 4000, () => console.log("gateway-402 listening on :4000"));
