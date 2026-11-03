export interface Transaction {
  transactionId: string;
  accountId: string;
  amount: number;
  merchantCategory: string;
  riskScore: number;
  flagged: boolean;
  similarTransactionIds: string[];
  createdAt: number;
}
