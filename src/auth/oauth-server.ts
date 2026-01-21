import express from "express";
import open from "open";
import { saveTokens, TokenData } from "./token-store.js";
import { getConfig } from "../config.js";
import { getAuthorizationEndpoint, getTokenEndpoint } from "./discovery.js";

const app = express();
const config = getConfig();

async function buildAuthUrl(): Promise<string> {
  const authEndpoint = await getAuthorizationEndpoint();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    state: crypto.randomUUID(),
  });
  return `${authEndpoint}?${params.toString()}`;
}

async function exchangeCodeForTokens(code: string, realmId: string): Promise<TokenData> {
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
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    expires_at: Date.now() + data.expires_in * 1000,
    realm_id: realmId,
  };
}

app.get("/callback", async (req, res) => {
  const { code, realmId, error } = req.query;

  if (error) {
    res.send(`<h1>Authorization Failed</h1><p>${error}</p>`);
    setTimeout(() => process.exit(1), 1000);
    return;
  }

  if (!code || !realmId) {
    res.send("<h1>Missing code or realmId</h1>");
    setTimeout(() => process.exit(1), 1000);
    return;
  }

  try {
    const tokens = await exchangeCodeForTokens(code as string, realmId as string);
    saveTokens(tokens);

    res.send(`
      <h1>Authorization Successful!</h1>
      <p>Realm ID: ${realmId}</p>
      <p>Tokens have been saved. You can close this window.</p>
      <p>The MCP server is now ready to use.</p>
    `);

    console.log("\n✓ Authorization successful!");
    console.log(`  Realm ID: ${realmId}`);
    console.log("  Tokens saved to .tokens.json");
    console.log("\nYou can now start the MCP server with: npm start");

    setTimeout(() => process.exit(0), 2000);
  } catch (err) {
    console.error("Token exchange error:", err);
    res.send(`<h1>Token Exchange Failed</h1><p>${err}</p>`);
    setTimeout(() => process.exit(1), 1000);
  }
});

const PORT = 3000;

app.listen(PORT, async () => {
  const authUrl = await buildAuthUrl();
  console.log(`\nOpening browser for QuickBooks authorization...`);
  console.log(`\nIf browser doesn't open, visit:\n${authUrl}\n`);
  open(authUrl);
});
