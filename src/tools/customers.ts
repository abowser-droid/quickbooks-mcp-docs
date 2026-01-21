import { qbQuery } from "../quickbooks/client.js";

interface Customer {
  Id: string;
  DisplayName: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  Balance: number;
  Active: boolean;
}

interface QueryResponse {
  QueryResponse: {
    Customer?: Customer[];
    totalCount?: number;
  };
}

export async function listCustomers(args: {
  search?: string;
  activeOnly?: boolean;
  limit?: number;
}): Promise<{ customers: Customer[]; count: number }> {
  const { search, activeOnly = true, limit = 100 } = args;

  let query = "SELECT * FROM Customer";
  const conditions: string[] = [];

  if (activeOnly) {
    conditions.push("Active = true");
  }

  if (search) {
    conditions.push(`DisplayName LIKE '%${search}%'`);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += ` MAXRESULTS ${limit}`;

  const response = await qbQuery<QueryResponse>(query);
  const customers = response.QueryResponse.Customer || [];

  return {
    customers,
    count: customers.length,
  };
}

export async function getCustomer(customerId: string): Promise<Customer | null> {
  const query = `SELECT * FROM Customer WHERE Id = '${customerId}'`;
  const response = await qbQuery<QueryResponse>(query);
  return response.QueryResponse.Customer?.[0] || null;
}

export const customerTools = {
  list_customers: {
    description: "List or search customers in QuickBooks. Returns customer names, contact info, and balances.",
    inputSchema: {
      type: "object" as const,
      properties: {
        search: {
          type: "string",
          description: "Search term to filter customers by name",
        },
        activeOnly: {
          type: "boolean",
          description: "Only return active customers (default: true)",
        },
        limit: {
          type: "number",
          description: "Maximum number of customers to return (default: 100)",
        },
      },
    },
    handler: listCustomers,
  },
  get_customer: {
    description: "Get detailed information about a specific customer by their ID",
    inputSchema: {
      type: "object" as const,
      properties: {
        customerId: {
          type: "string",
          description: "The QuickBooks customer ID",
        },
      },
      required: ["customerId"],
    },
    handler: async (args: { customerId: string }) => getCustomer(args.customerId),
  },
};
