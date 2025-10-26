import express, { Request, Response } from "express";
import morgan from "morgan";

const app = express();
app.use(express.json());
app.use(morgan("tiny"));

app.get("/food/menu", (_req: Request, res: Response) => {
  res.json({
    restaurant: "Validator Bistro",
    items: [
      { name: "Finality Falafel", price: "0.10 USDC" },
      { name: "Lamport Latte", price: "0.05 USDC" }
    ]
  });
});

app.get("/tools/linter", (_req: Request, res: Response) => {
  res.json({ tool: "Super Linter", plan: "per-run", success: true });
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => console.log(`merchants on :${PORT}`));
