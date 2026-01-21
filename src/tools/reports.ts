import { qbRequest } from "../quickbooks/client.js";

interface ReportResponse {
  Header: {
    ReportName: string;
    DateMacro?: string;
    StartPeriod?: string;
    EndPeriod?: string;
    Currency: string;
  };
  Columns: {
    Column: Array<{ ColTitle: string; ColType: string }>;
  };
  Rows: {
    Row?: ReportRow[];
  };
}

interface ReportRow {
  Header?: { ColData: Array<{ value: string }> };
  Rows?: { Row: ReportRow[] };
  Summary?: { ColData: Array<{ value: string }> };
  ColData?: Array<{ value: string }>;
  type?: string;
}

function formatReportData(report: ReportResponse): {
  name: string;
  period: string;
  columns: string[];
  rows: Array<{ label: string; values: string[]; isTotal?: boolean }>;
} {
  const columns = report.Columns.Column.map((c) => c.ColTitle);
  const rows: Array<{ label: string; values: string[]; isTotal?: boolean }> = [];

  function processRows(reportRows: ReportRow[] | undefined, indent = 0): void {
    if (!reportRows) return;

    for (const row of reportRows) {
      if (row.Header) {
        const label = "  ".repeat(indent) + row.Header.ColData[0].value;
        rows.push({ label, values: row.Header.ColData.slice(1).map((c) => c.value) });
      }

      if (row.ColData) {
        const label = "  ".repeat(indent) + row.ColData[0].value;
        rows.push({ label, values: row.ColData.slice(1).map((c) => c.value) });
      }

      if (row.Rows) {
        processRows(row.Rows.Row, indent + 1);
      }

      if (row.Summary) {
        const label = "  ".repeat(indent) + row.Summary.ColData[0].value;
        rows.push({
          label,
          values: row.Summary.ColData.slice(1).map((c) => c.value),
          isTotal: true,
        });
      }
    }
  }

  processRows(report.Rows.Row);

  return {
    name: report.Header.ReportName,
    period: report.Header.StartPeriod
      ? `${report.Header.StartPeriod} to ${report.Header.EndPeriod}`
      : report.Header.DateMacro || "Current",
    columns,
    rows,
  };
}

export async function getProfitAndLoss(args: {
  startDate?: string;
  endDate?: string;
}): Promise<ReturnType<typeof formatReportData>> {
  const query: Record<string, string> = {};

  if (args.startDate) query.start_date = args.startDate;
  if (args.endDate) query.end_date = args.endDate;

  const report = await qbRequest<ReportResponse>("/reports/ProfitAndLoss", { query });
  return formatReportData(report);
}

export async function getBalanceSheet(args: {
  asOfDate?: string;
}): Promise<ReturnType<typeof formatReportData>> {
  const query: Record<string, string> = {};

  if (args.asOfDate) query.date_macro = args.asOfDate;

  const report = await qbRequest<ReportResponse>("/reports/BalanceSheet", { query });
  return formatReportData(report);
}

export async function getARAgingSummary(args: {
  asOfDate?: string;
}): Promise<ReturnType<typeof formatReportData>> {
  const query: Record<string, string> = {};

  if (args.asOfDate) query.report_date = args.asOfDate;

  const report = await qbRequest<ReportResponse>("/reports/AgedReceivables", { query });
  return formatReportData(report);
}

export const reportTools = {
  get_profit_and_loss: {
    description:
      "Get the Profit & Loss (Income Statement) report showing revenue, expenses, and net income for a period",
    inputSchema: {
      type: "object" as const,
      properties: {
        startDate: {
          type: "string",
          description: "Start date for the report (YYYY-MM-DD). Defaults to start of current fiscal year.",
        },
        endDate: {
          type: "string",
          description: "End date for the report (YYYY-MM-DD). Defaults to today.",
        },
      },
    },
    handler: getProfitAndLoss,
  },
  get_balance_sheet: {
    description:
      "Get the Balance Sheet report showing assets, liabilities, and equity as of a specific date",
    inputSchema: {
      type: "object" as const,
      properties: {
        asOfDate: {
          type: "string",
          description: "Date for the balance sheet (YYYY-MM-DD). Defaults to today.",
        },
      },
    },
    handler: getBalanceSheet,
  },
  get_ar_aging: {
    description:
      "Get the Accounts Receivable Aging Summary showing outstanding customer balances by age (current, 1-30 days, 31-60 days, etc.)",
    inputSchema: {
      type: "object" as const,
      properties: {
        asOfDate: {
          type: "string",
          description: "Date for the aging report (YYYY-MM-DD). Defaults to today.",
        },
      },
    },
    handler: getARAgingSummary,
  },
};
