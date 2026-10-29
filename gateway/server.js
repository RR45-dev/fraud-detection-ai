const express = require("express");
const cors = require("cors");
const client = require("prom-client");
function uuidv4() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const { scoreTransaction } = require("./grpcClient");
const { ensureTable, saveTransaction, listTransactions } = require("./dynamo");
const { issueToken, requireAuth } = require("./auth");

const app = express();
app.use(cors());
app.use(express.json());

// --- Prometheus metrics
client.collectDefaultMetrics();
const requestCounter = new client.Counter({
  name: "gateway_requests_total",
  help: "Total requests handled by the gateway",
  labelNames: ["route"],
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// --- Mock login (swap for real OIDC in production; see auth.js)
app.post("/api/auth/login", (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: "username required" });
  const token = issueToken({ username, role: "analyst" });
  res.json({ token });
});

// --- Score + persist a transaction
app.post("/api/transactions", requireAuth, async (req, res) => {
  requestCounter.inc({ route: "score_transaction" });
  try {
    const transactionId = req.body.transactionId || uuidv4();
    const scoreResponse = await scoreTransaction({ ...req.body, transactionId });

    const record = {
      transactionId,
      accountId: req.body.accountId,
      amount: req.body.amount,
      merchantCategory: req.body.merchantCategory,
      riskScore: scoreResponse.riskScore,
      flagged: scoreResponse.flagged,
      similarTransactionIds: scoreResponse.similarTransactionIds || [],
      createdAt: Date.now(),
    };
    await saveTransaction(record);
    res.status(201).json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "scoring failed", details: err.message });
  }
});

// --- List flagged/scored transactions for the analyst dashboard
app.get("/api/transactions", requireAuth, async (req, res) => {
  requestCounter.inc({ route: "list_transactions" });
  res.json(await listTransactions());
});

const PORT = process.env.PORT || 4000;
ensureTable()
  .then(() => app.listen(PORT, () => console.log(`Gateway listening on :${PORT}`)))
  .catch((err) => {
    console.error("Failed to initialize DynamoDB table", err);
    process.exit(1);
  });
