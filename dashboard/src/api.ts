import { Transaction } from "./types";

const API_BASE = process.env.REACT_APP_GATEWAY_URL || "http://localhost:4000";

export async function login(username: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  const data = await res.json();
  return data.token;
}

export async function submitTransaction(
  token: string,
  payload: Partial<Transaction> & { lat: number; lon: number; homeLat: number; homeLon: number; hourOfDay: number }
): Promise<Transaction> {
  const res = await fetch(`${API_BASE}/api/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to score transaction");
  return res.json();
}

export async function listTransactions(token: string): Promise<Transaction[]> {
  const res = await fetch(`${API_BASE}/api/transactions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}
