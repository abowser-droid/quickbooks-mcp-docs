import { loadTokens, saveTokens, isTokenExpired, TokenData } from "../auth/token-store.js";
import { getConfig } from "../config.js";
import { getTokenEndpoint } from "../auth/discovery.js";

function getBaseUrl(environment: "sandbox" | "production"): string {
  return environment === "sandbox"
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
}

async function refreshAccessToken(tokens: TokenData): Promise<TokenData> {
  const config = getConfig();
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");
  const tokenEndpoint = await getTokenEndpoint();

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();

  const newTokens: TokenData = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    expires_at: Date.now() + data.expires_in * 1000,
    realm_id: tokens.realm_id,
  };

  saveTokens(newTokens);
  return newTokens;
}

async function getValidTokens(): Promise<TokenData> {
  let tokens = loadTokens();

  if (!tokens || !tokens.access_token) {
    throw new Error("Not authenticated. Run 'npm run auth' to authorize with QuickBooks.");
  }

  if (isTokenExpired(tokens)) {
    tokens = await refreshAccessToken(tokens);
  }

  return tokens;
}

export async function qbRequest<T>(
  endpoint: string,
  options: { method?: string; body?: unknown; query?: Record<string, string> } = {}
): Promise<T> {
  const config = getConfig();
  const tokens = await getValidTokens();
  const baseUrl = getBaseUrl(config.environment);

  let url = `${baseUrl}/v3/company/${tokens.realm_id}${endpoint}`;

  if (options.query) {
    const params = new URLSearchParams(options.query);
    url += `?${params.toString()}`;
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${tokens.access_token}`,
    Accept: "application/json",
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // Capture intuit_tid for debugging and support
  const intuitTid = response.headers.get("intuit_tid");
  if (intuitTid) {
    console.error(`[QuickBooks] intuit_tid: ${intuitTid}`);
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`QuickBooks API error (${response.status}): ${error}${intuitTid ? ` [intuit_tid: ${intuitTid}]` : ""}`);
  }

  return response.json() as Promise<T>;
}

export async function qbQuery<T>(query: string): Promise<T> {
  return qbRequest<T>("/query", { query: { query } });
}
