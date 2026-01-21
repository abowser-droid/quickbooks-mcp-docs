import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_FILE = join(__dirname, "../../.tokens.json");

export interface TokenData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  realm_id: string;
}

export function saveTokens(tokens: TokenData): void {
  writeFileSync(TOKEN_FILE, JSON.stringify(tokens, null, 2));
}

export function loadTokens(): TokenData | null {
  if (!existsSync(TOKEN_FILE)) {
    return null;
  }
  try {
    const data = readFileSync(TOKEN_FILE, "utf-8");
    return JSON.parse(data) as TokenData;
  } catch {
    return null;
  }
}

export function isTokenExpired(tokens: TokenData): boolean {
  const bufferMs = 5 * 60 * 1000; // 5 minute buffer
  return Date.now() >= tokens.expires_at - bufferMs;
}

export function clearTokens(): void {
  if (existsSync(TOKEN_FILE)) {
    writeFileSync(TOKEN_FILE, "{}");
  }
}
