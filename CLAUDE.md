# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server that integrates QuickBooks Online with Claude Desktop. It provides tools for querying customers, invoices, accounts, transactions, and financial reports from QuickBooks.

## Commands

```bash
npm run build    # Compile TypeScript to dist/
npm run dev      # Run server in development mode with tsx
npm run start    # Run compiled server from dist/
npm run auth     # Run OAuth server to authorize with QuickBooks (required before first use)
```

## Architecture

### Entry Point and MCP Server
`src/index.ts` - Registers all MCP tools with the server using `@modelcontextprotocol/sdk`. Each tool is defined with a Zod schema for input validation and calls handler functions from the tools modules.

### QuickBooks API Client
`src/quickbooks/client.ts` - Core API client providing:
- `qbRequest<T>(endpoint, options)` - Make authenticated requests to QuickBooks API
- `qbQuery<T>(query)` - Execute QuickBooks Query Language (similar to SQL)
- Automatic token refresh when access tokens expire

### Authentication Flow
OAuth 2.0 flow with three key files:
- `src/auth/oauth-server.ts` - Express server that handles OAuth callback, exchanges code for tokens
- `src/auth/token-store.ts` - Persists tokens to `.tokens.json`, handles expiration checks
- `src/auth/discovery.ts` - Fetches OAuth endpoints from Intuit's discovery document (sandbox vs production)

### Tools (src/tools/)
Each tool file exports handler functions that use `qbQuery` to fetch data:
- `customers.ts` - list_customers, get_customer
- `invoices.ts` - list_invoices
- `accounts.ts` - list_accounts, get_account_balances
- `reports.ts` - get_profit_and_loss, get_balance_sheet, get_ar_aging
- `transactions.ts` - search_transactions

### Configuration
- `src/config.ts` - Loads credentials from `.env` file (QB_CLIENT_ID, QB_CLIENT_SECRET, QB_ENVIRONMENT)
- Environment can be `sandbox` or `production`, affecting API base URLs and discovery endpoints

### Logging
`src/logger.ts` - Writes JSON logs to `logs/quickbooks-mcp.log`. Captures `intuit_tid` from API responses for Intuit support debugging.

## Key Files
- `.env` - OAuth credentials (copy from `.env.example`)
- `.tokens.json` - Stored OAuth tokens (created after running `npm run auth`)
