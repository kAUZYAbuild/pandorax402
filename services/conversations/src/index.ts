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
  const { role, text, meta, convoId, scenario } = req.body || {};
  const m = await prisma.message.create({ data: { role, text, meta, convoId, scenario } });
  res.status(201).json({ message: m });
});

app.get("/messages/:convoId", async (req, res) => {
  const { convoId } = req.params;
  const list = await prisma.message.findMany({ where: { convoId }, orderBy: { createdAt: "asc" } });
  res.json({ messages: list });
});

app.get("/latest", async (_req, res) => {
  const list = await prisma.message.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  res.json({ messages: list });
});

app.listen(process.env.PORT || 4015, () => console.log("conversations on :4015"));
