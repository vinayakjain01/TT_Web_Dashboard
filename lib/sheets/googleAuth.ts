import { createSign } from "node:crypto";

/**
 * Service-account access token for reading sheets that are NOT shared publicly.
 * Credentials come from GOOGLE_SERVICE_ACCOUNT_JSON (the full downloaded key file as a
 * single JSON string). No extra dependency: the OAuth2 JWT-bearer flow is just an
 * RS256-signed JWT exchanged at Google's token endpoint.
 */
interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

let cached: { token: string; expiresAt: number } | null = null;

export function hasServiceAccount(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

export async function getServiceAccountToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not set.");
  let key: ServiceAccountKey;
  try {
    key = JSON.parse(raw);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: key.client_email,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(key.private_key);
  const assertion = `${header}.${claims}.${b64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!res.ok) {
    throw new Error(`Google token exchange failed: HTTP ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cached.token;
}
