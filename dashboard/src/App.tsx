import React, { useEffect, useState } from "react";
import { login, submitTransaction, listTransactions } from "./api";
import { Transaction } from "./types";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState("analyst1");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState({ accountId: "acct-1", amount: 50, merchantCategory: "grocery" });
  const [status, setStatus] = useState("");

  const refresh = async (t: string) => {
    setTransactions(await listTransactions(t));
  };

  useEffect(() => {
    if (token) refresh(token);
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = await login(username);
    setToken(t);
  };

  const handleScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    try {
      await submitTransaction(token, {
        accountId: form.accountId,
        amount: Number(form.amount),
        merchantCategory: form.merchantCategory,
        lat: 40.7128 + Math.random() * 5, // simulated transaction location
        lon: -74.006 + Math.random() * 5,
        homeLat: 40.7128, // account's registered home location
        homeLon: -74.006,
        hourOfDay: new Date().getHours(),
      } as any);
      setStatus("Transaction scored.");
      refresh(token);
    } catch (err: any) {
      setStatus("Error: " + err.message);
    }
  };

  if (!token) {
    return (
      <div style={{ fontFamily: "sans-serif", maxWidth: 400, margin: "80px auto" }}>
        <h1>Fraud Risk Dashboard</h1>
        <form onSubmit={handleLogin}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
          <button type="submit">Sign in</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "sans-serif", maxWidth: 800, margin: "40px auto" }}>
      <h1>Fraud Risk Dashboard</h1>
      <form onSubmit={handleScore} style={{ marginBottom: 24 }}>
        <input value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })} placeholder="Account ID" />
        <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} placeholder="Amount" />
        <input value={form.merchantCategory} onChange={(e) => setForm({ ...form, merchantCategory: e.target.value })} placeholder="Merchant category" />
        <button type="submit">Score transaction</button>
      </form>
      {status && <p>{status}</p>}

      <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead><tr><th>Tx ID</th><th>Account</th><th>Amount</th><th>Risk</th><th>Flagged</th><th>Similar past cases</th></tr></thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.transactionId} style={{ background: t.flagged ? "#ffe5e5" : undefined }}>
              <td>{t.transactionId.slice(0, 8)}</td>
              <td>{t.accountId}</td>
              <td>${t.amount}</td>
              <td>{t.riskScore.toFixed(2)}</td>
              <td>{t.flagged ? "YES" : "no"}</td>
              <td>{t.similarTransactionIds.map((s) => s.slice(0, 8)).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
