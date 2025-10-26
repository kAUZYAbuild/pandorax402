import express from "express";
import morgan from "morgan";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

app.post("/messages", async (req, res) => {
  try {
    const { role, text, meta, convoId, scenario } = req.body || {};
    const m = await prisma.message.create({ data: { role, text, meta, convoId, scenario } });
    res.status(201).json({ message: m });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "failed to create message" });
  }
});

app.get("/messages/:convoId", async (req, res) => {
  try {
    const { convoId } = req.params;
    const list = await prisma.message.findMany({ where: { convoId }, orderBy: { createdAt: "asc" } });
    res.json({ messages: list });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "failed to fetch messages" });
  }
});

app.get("/latest", async (_req, res) => {
  try {
    const list = await prisma.message.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    res.json({ messages: list });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "failed to fetch latest messages" });
  }
});

const PORT = process.env.PORT || 4015;
app.listen(PORT, () => console.log(`conversations on :${PORT}`));
