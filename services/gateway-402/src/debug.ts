import { PrismaClient } from "@prisma/client";
import { Router } from "express";
const prisma = new PrismaClient();
export const debugRouter = Router();
debugRouter.get("/_debug/payments", async (_req, res) => {
  const payments = await prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  res.json({ payments });
});
