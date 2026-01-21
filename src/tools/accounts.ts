import { qbQuery } from "../quickbooks/client.js";

interface Account {
  Id: string;
  Name: string;
  AccountType: string;
  AccountSubType: string;
  CurrentBalance: number;
  Active: boolean;
  Classification: string;
}

interface QueryResponse {
  QueryResponse: {
    Account?: Account[];
  };
}

export async function listAccounts(args: {
  accountType?: string;
  activeOnly?: boolean;
}): Promise<{ accounts: Account[]; count: number }> {
  const { accountType, activeOnly = true } = args;

  let query = "SELECT * FROM Account";
  const conditions: string[] = [];

  if (activeOnly) {
    conditions.push("Active = true");
  }

  if (accountType) {
    conditions.push(`AccountType = '${accountType}'`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  const response = await qbQuery<QueryResponse>(query);
  const accounts = response.QueryResponse.Account || [];

  return {
    accounts,
    count: accounts.length,
  };
}

export async function getAccountBalances(): Promise<{
  assets: number;
  liabilities: number;
  equity: number;
  income: number;
  expenses: number;
  accounts: Array<{ name: string; type: string; balance: number }>;
}> {
  const { accounts } = await listAccounts({ activeOnly: true });

  const totals = {
    assets: 0,
    liabilities: 0,
    equity: 0,
    income: 0,
    expenses: 0,
  };

  const accountList = accounts.map((acc) => {
    const classification = acc.Classification.toLowerCase();
    if (classification === "asset") totals.assets += acc.CurrentBalance;
    else if (classification === "liability") totals.liabilities += acc.CurrentBalance;
    else if (classification === "equity") totals.equity += acc.CurrentBalance;
    else if (classification === "revenue") totals.income += acc.CurrentBalance;
    else if (classification === "expense") totals.expenses += acc.CurrentBalance;

    return {
      name: acc.Name,
      type: acc.AccountType,
      balance: acc.CurrentBalance,
    };
  });

  return {
    ...totals,
    accounts: accountList,
  };
}

export const accountTools = {
  list_accounts: {
    description: "List chart of accounts in QuickBooks. Can filter by account type.",
    inputSchema: {
      type: "object" as const,
      properties: {
        accountType: {
          type: "string",
          description:
            "Filter by account type (e.g., Bank, Accounts Receivable, Income, Expense, etc.)",
        },
        activeOnly: {
          type: "boolean",
          description: "Only return active accounts (default: true)",
        },
      },
    },
    handler: listAccounts,
  },
  get_account_balances: {
    description:
      "Get a summary of account balances grouped by classification (assets, liabilities, equity, income, expenses)",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
    handler: getAccountBalances,
  },
};
