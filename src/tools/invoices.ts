import { qbQuery } from "../quickbooks/client.js";

interface Invoice {
  Id: string;
  DocNumber: string;
  CustomerRef: { value: string; name: string };
  TxnDate: string;
  DueDate: string;
  TotalAmt: number;
  Balance: number;
  EmailStatus: string;
  Line: Array<{
    Description?: string;
    Amount: number;
    DetailType: string;
  }>;
}

interface QueryResponse {
  QueryResponse: {
    Invoice?: Invoice[];
    totalCount?: number;
  };
}

export async function listInvoices(args: {
  customerId?: string;
  status?: "paid" | "unpaid" | "overdue" | "all";
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<{ invoices: Invoice[]; count: number }> {
  const { customerId, status = "all", startDate, endDate, limit = 100 } = args;

  let query = "SELECT * FROM Invoice";
  const conditions: string[] = [];

  if (customerId) {
    conditions.push(`CustomerRef = '${customerId}'`);
  }

  if (startDate) {
    conditions.push(`TxnDate >= '${startDate}'`);
  }

  if (endDate) {
    conditions.push(`TxnDate <= '${endDate}'`);
  }

  if (status === "paid") {
    conditions.push("Balance = '0'");
  } else if (status === "unpaid") {
    conditions.push("Balance > '0'");
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += ` ORDERBY TxnDate DESC MAXRESULTS ${limit}`;

  const response = await qbQuery<QueryResponse>(query);
  let invoices = response.QueryResponse.Invoice || [];

  // Filter overdue invoices in-memory (QB doesn't support date comparison with CURRENT_DATE)
  if (status === "overdue") {
    const today = new Date().toISOString().split("T")[0];
    invoices = invoices.filter((inv) => inv.Balance > 0 && inv.DueDate < today);
  }

  return {
    invoices,
    count: invoices.length,
  };
}

export const invoiceTools = {
  list_invoices: {
    description:
      "List or search invoices in QuickBooks. Can filter by customer, status (paid/unpaid/overdue), and date range.",
    inputSchema: {
      type: "object" as const,
      properties: {
        customerId: {
          type: "string",
          description: "Filter invoices by customer ID",
        },
        status: {
          type: "string",
          enum: ["paid", "unpaid", "overdue", "all"],
          description: "Filter by payment status (default: all)",
        },
        startDate: {
          type: "string",
          description: "Start date for invoice filter (YYYY-MM-DD)",
        },
        endDate: {
          type: "string",
          description: "End date for invoice filter (YYYY-MM-DD)",
        },
        limit: {
          type: "number",
          description: "Maximum number of invoices to return (default: 100)",
        },
      },
    },
    handler: listInvoices,
  },
};
