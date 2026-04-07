import type { PaymentMethod, TransactionType } from "./database";

export interface NewTransaction {
  amount: number;
  type: TransactionType;
  categoryId: string;
  paymentMethod: PaymentMethod | string;
  note?: string;
  txnDate: string; // YYYY-MM-DD
}
