import { qbQuery } from "../quickbooks/client.js";

interface Purchase {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  TotalAmt: number;
  PaymentType?: string;
  EntityRef?: { value: string; name: string };
  AccountRef: { value: string; name: string };
  Line: Array<{
    Description?: string;
    Amount: number;
    DetailType: string;
    AccountBasedExpenseLineDetail?: {
      AccountRef: { value: string; name: string };
    };
  }>;
}

interface Payment {
  Id: string;
  TxnDate: string;
  TotalAmt: number;
  CustomerRef: { value: string; name: string };
  DepositToAccountRef?: { value: string; name: string };
}

interface Bill {
  Id: string;
  DocNumber?: string;
  TxnDate: string;
  DueDate: string;
  TotalAmt: number;
  Balance: number;
  VendorRef: { value: string; name: string };
}

type Transaction =
  | { type: "purchase"; data: Purchase }
  | { type: "payment"; data: Payment }
  | { type: "bill"; data: Bill };

interface QueryResponse<T> {
  QueryResponse: {
    [key: string]: T[] | undefined;
  };
}

export async function searchTransactions(args: {
  type?: "purchase" | "payment" | "bill" | "all";
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
}): Promise<{ transactions: Transaction[]; count: number }> {
  const { type = "all", startDate, endDate, minAmount, maxAmount, limit = 50 } = args;

  const transactions: Transaction[] = [];

  async function queryEntity<T>(
    entityName: string,
    txnType: Transaction["type"]
  ): Promise<void> {
    let query = `SELECT * FROM ${entityName}`;
    const conditions: string[] = [];

    if (startDate) conditions.push(`TxnDate >= '${startDate}'`);
    if (endDate) conditions.push(`TxnDate <= '${endDate}'`);
    if (minAmount !== undefined) conditions.push(`TotalAmt >= '${minAmount}'`);
    if (maxAmount !== undefined) conditions.push(`TotalAmt <= '${maxAmount}'`);

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += ` ORDERBY TxnDate DESC MAXRESULTS ${limit}`;

    const response = await qbQuery<QueryResponse<T>>(query);
    const items = response.QueryResponse[entityName] || [];

    for (const item of items) {
      transactions.push({ type: txnType, data: item } as Transaction);
    }
  }

  const queries: Promise<void>[] = [];

  if (type === "all" || type === "purchase") {
    queries.push(queryEntity<Purchase>("Purchase", "purchase"));
  }
  if (type === "all" || type === "payment") {
    queries.push(queryEntity<Payment>("Payment", "payment"));
  }
  if (type === "all" || type === "bill") {
    queries.push(queryEntity<Bill>("Bill", "bill"));
  }

  await Promise.all(queries);

  // Sort by date descending
  transactions.sort((a, b) => {
    const dateA = new Date(a.data.TxnDate).getTime();
    const dateB = new Date(b.data.TxnDate).getTime();
    return dateB - dateA;
  });

  return {
    transactions: transactions.slice(0, limit),
    count: transactions.length,
  };
}

export const transactionTools = {
  search_transactions: {
    description:
      "Search transactions in QuickBooks including purchases, payments, and bills. Can filter by type, date range, and amount.",
    inputSchema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["purchase", "payment", "bill", "all"],
          description: "Type of transaction to search (default: all)",
        },
        startDate: {
          type: "string",
          description: "Start date for transaction filter (YYYY-MM-DD)",
        },
        endDate: {
          type: "string",
          description: "End date for transaction filter (YYYY-MM-DD)",
        },
        minAmount: {
          type: "number",
          description: "Minimum transaction amount",
        },
        maxAmount: {
          type: "number",
          description: "Maximum transaction amount",
        },
        limit: {
          type: "number",
          description: "Maximum number of transactions to return (default: 50)",
        },
      },
    },
    handler: searchTransactions,
  },
};
