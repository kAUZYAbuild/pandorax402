import { PrismaClient } from "@prisma/client";
import { Router, Request, Response } from "express";

const prisma = new PrismaClient();
export const debugRouter = Router();

debugRouter.get("/_debug/payments", async (_req: Request, res: Response) => {
  const payments = await prisma.payment.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  res.json({ payments });
});
