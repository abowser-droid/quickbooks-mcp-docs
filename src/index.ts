import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { listCustomers, getCustomer } from "./tools/customers.js";
import { listInvoices } from "./tools/invoices.js";
import { listAccounts, getAccountBalances } from "./tools/accounts.js";
import { getProfitAndLoss, getBalanceSheet, getARAgingSummary } from "./tools/reports.js";
import { searchTransactions } from "./tools/transactions.js";

const server = new McpServer({
  name: "quickbooks-mcp",
  version: "1.0.0",
});

// Customer tools
server.tool(
  "list_customers",
  "List or search customers in QuickBooks. Returns customer names, contact info, and balances.",
  {
    search: z.string().optional().describe("Search term to filter customers by name"),
    activeOnly: z.boolean().optional().describe("Only return active customers (default: true)"),
    limit: z.number().optional().describe("Maximum number of customers to return (default: 100)"),
  },
  async (args) => {
    const result = await listCustomers(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_customer",
  "Get detailed information about a specific customer by their ID",
  {
    customerId: z.string().describe("The QuickBooks customer ID"),
  },
  async (args) => {
    const result = await getCustomer(args.customerId);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// Invoice tools
server.tool(
  "list_invoices",
  "List or search invoices in QuickBooks. Can filter by customer, status (paid/unpaid/overdue), and date range.",
  {
    customerId: z.string().optional().describe("Filter invoices by customer ID"),
    status: z.enum(["paid", "unpaid", "overdue", "all"]).optional().describe("Filter by payment status (default: all)"),
    startDate: z.string().optional().describe("Start date for invoice filter (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date for invoice filter (YYYY-MM-DD)"),
    limit: z.number().optional().describe("Maximum number of invoices to return (default: 100)"),
  },
  async (args) => {
    const result = await listInvoices(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// Account tools
server.tool(
  "list_accounts",
  "List chart of accounts in QuickBooks. Can filter by account type.",
  {
    accountType: z.string().optional().describe("Filter by account type (e.g., Bank, Accounts Receivable, Income, Expense)"),
    activeOnly: z.boolean().optional().describe("Only return active accounts (default: true)"),
  },
  async (args) => {
    const result = await listAccounts(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_account_balances",
  "Get a summary of account balances grouped by classification (assets, liabilities, equity, income, expenses)",
  {},
  async () => {
    const result = await getAccountBalances();
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// Report tools
server.tool(
  "get_profit_and_loss",
  "Get the Profit & Loss (Income Statement) report showing revenue, expenses, and net income for a period",
  {
    startDate: z.string().optional().describe("Start date for the report (YYYY-MM-DD). Defaults to start of current fiscal year."),
    endDate: z.string().optional().describe("End date for the report (YYYY-MM-DD). Defaults to today."),
  },
  async (args) => {
    const result = await getProfitAndLoss(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_balance_sheet",
  "Get the Balance Sheet report showing assets, liabilities, and equity as of a specific date",
  {
    asOfDate: z.string().optional().describe("Date for the balance sheet (YYYY-MM-DD). Defaults to today."),
  },
  async (args) => {
    const result = await getBalanceSheet(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_ar_aging",
  "Get the Accounts Receivable Aging Summary showing outstanding customer balances by age (current, 1-30 days, 31-60 days, etc.)",
  {
    asOfDate: z.string().optional().describe("Date for the aging report (YYYY-MM-DD). Defaults to today."),
  },
  async (args) => {
    const result = await getARAgingSummary(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// Transaction tools
server.tool(
  "search_transactions",
  "Search transactions in QuickBooks including purchases, payments, and bills. Can filter by type, date range, and amount.",
  {
    type: z.enum(["purchase", "payment", "bill", "all"]).optional().describe("Type of transaction to search (default: all)"),
    startDate: z.string().optional().describe("Start date for transaction filter (YYYY-MM-DD)"),
    endDate: z.string().optional().describe("End date for transaction filter (YYYY-MM-DD)"),
    minAmount: z.number().optional().describe("Minimum transaction amount"),
    maxAmount: z.number().optional().describe("Maximum transaction amount"),
    limit: z.number().optional().describe("Maximum number of transactions to return (default: 50)"),
  },
  async (args) => {
    const result = await searchTransactions(args);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("QuickBooks MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
