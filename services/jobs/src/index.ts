import express from "express";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import { keypairFromEnv, transferUSDC } from "@pandorax402/shared";
import { PublicKey } from "@solana/web3.js";
import { env } from "./env.js";

const prisma = new PrismaClient();
const employer = keypairFromEnv(env.EMPLOYER_SECRET_KEY);
const USDC_MINT = new PublicKey(env.USDC_MINT);

const app = express();
app.use(express.json());
app.use(morgan("tiny"));

app.get("/tasks", async (_req, res) => {
  try {
    const tasks = await prisma.task.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ tasks });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "failed to fetch tasks" });
  }
});

app.post("/tasks", async (req, res) => {
  try {
    const { title, description, wageBase } = req.body || {};
    const t = await prisma.task.create({ data: { title, description, wageBase } });
    res.status(201).json({ task: t });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "failed to create task" });
  }
});

app.post("/tasks/:id/claim", async (req, res) => {
  try {
    const { id } = req.params;
    const { agent } = req.body;
    const t = await prisma.task.findUnique({ where: { id } });
    if (!t || t.status !== "open") return res.status(409).json({ error: "not open" });
    const u = await prisma.task.update({ where: { id }, data: { status: "claimed", claimedBy: agent } });
    res.json({ task: u });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "failed to claim task" });
  }
});

app.post("/tasks/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    const { agent } = req.body;
    const t = await prisma.task.findUnique({ where: { id } });
    if (!t || t.status !== "claimed" || t.claimedBy !== agent) return res.status(409).json({ error: "not claimed by you" });
    try {
      const sig = await transferUSDC(employer, new PublicKey(agent), USDC_MINT, BigInt(t.wageBase));
      const u = await prisma.task.update({ where: { id }, data: { status: "completed", wageTx: sig } });
      res.json({ ok: true, signature: sig, task: u });
    } catch (e:any) {
      res.status(500).json({ error: e?.message || "wage failed" });
    }
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "task completion failed" });
  }
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => console.log(`jobs on :${PORT}`));
