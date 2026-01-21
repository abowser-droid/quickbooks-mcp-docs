import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = join(__dirname, "../.env");

export interface Config {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  environment: "sandbox" | "production";
}

function loadEnvFile(): Record<string, string> {
  const env: Record<string, string> = {};

  if (existsSync(ENV_FILE)) {
    const content = readFileSync(ENV_FILE, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join("=").trim();
        }
      }
    }
  }

  return env;
}

export function getConfig(): Config {
  const fileEnv = loadEnvFile();
  const env = { ...fileEnv, ...process.env };

  const clientId = env.QB_CLIENT_ID;
  const clientSecret = env.QB_CLIENT_SECRET;
  const redirectUri = env.QB_REDIRECT_URI || "http://localhost:3000/callback";
  const environment = env.QB_ENVIRONMENT as "sandbox" | "production" || "sandbox";

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing QB_CLIENT_ID or QB_CLIENT_SECRET. Copy .env.example to .env and fill in your credentials."
    );
  }

  return { clientId, clientSecret, redirectUri, environment };
}
