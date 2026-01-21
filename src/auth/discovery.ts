import { getConfig } from "../config.js";

interface DiscoveryDocument {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  revocation_endpoint: string;
  jwks_uri: string;
}

let cachedDiscovery: DiscoveryDocument | null = null;

function getDiscoveryUrl(): string {
  const config = getConfig();
  return config.environment === "sandbox"
    ? "https://developer.api.intuit.com/.well-known/openid_sandbox_configuration"
    : "https://developer.api.intuit.com/.well-known/openid_configuration";
}

export async function getDiscoveryDocument(): Promise<DiscoveryDocument> {
  if (cachedDiscovery) {
    return cachedDiscovery;
  }

  const response = await fetch(getDiscoveryUrl());

  if (!response.ok) {
    throw new Error(`Failed to fetch discovery document: ${response.status}`);
  }

  cachedDiscovery = await response.json() as DiscoveryDocument;
  return cachedDiscovery;
}

export async function getAuthorizationEndpoint(): Promise<string> {
  const discovery = await getDiscoveryDocument();
  return discovery.authorization_endpoint;
}

export async function getTokenEndpoint(): Promise<string> {
  const discovery = await getDiscoveryDocument();
  return discovery.token_endpoint;
}

export async function getRevocationEndpoint(): Promise<string> {
  const discovery = await getDiscoveryDocument();
  return discovery.revocation_endpoint;
}

export function clearDiscoveryCache(): void {
  cachedDiscovery = null;
}
