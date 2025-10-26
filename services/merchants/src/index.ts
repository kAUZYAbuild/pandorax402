import express from "express";
import morgan from "morgan";
const app = express();
app.use(express.json());
app.use(morgan("tiny"));

app.get("/food/menu", (_req, res) => {
  res.json({
    restaurant: "Validator Bistro",
    items: [
      { name: "Finality Falafel", price: "0.10 USDC" },
      { name: "Lamport Latte", price: "0.05 USDC" }
    ]
  });
});

app.get("/tools/linter", (_req, res) => {
  res.json({ tool: "Super Linter", plan: "per-run", success: true });
});

app.listen(4002, () => console.log("merchants on :4002"));
