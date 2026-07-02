import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import {
  MCP_BASE_URL,
  OAUTH_SERVER_URL,
  OAUTH_ENDPOINTS,
  TOKEN_PATH,
  OAUTH_AUTHORIZE_URL,
  CLIENT_ID,
  SHORT_LINK_ENDPOINT,
  ENABLE_SHORT_LINK,
} from './constants.js';

// Generate PKCE code_verifier (RFC 7636 Spec: 32 Byte random number base64url Encoded 43 Characters, Sufficient entropy)
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

// SHA256 Hash
function sha256(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('base64url');
}

// Generate random session_id
function generateSessionId(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Save token to local
export function saveToken(token: any): void {
  const dir = path.dirname(TOKEN_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
}

// Read local token
export function loadToken(): any | null {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const data = fs.readFileSync(TOKEN_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch {
    // Ignore errors
  }
  return null;
}

// Check if logged in
export function isLoggedIn(): boolean {
  const token = loadToken();
  return token !== null && token.access_token !== undefined;
}

export function logout(): void {
  if (fs.existsSync(TOKEN_PATH)) {
    fs.unlinkSync(TOKEN_PATH);
    console.log('Logged out successfully');
  }
}

// OAuth Login Flow
export async function login(): Promise<void> {
  console.log('Starting OAuth Login...\n');

  // 1. Generate PKCE params
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = sha256(codeVerifier);
  const sessionId = generateSessionId();

  // 2. Fetch auth state
  console.log('Fetching authorization state...');
  const initResponse = await fetch(
    `${OAUTH_SERVER_URL}${OAUTH_ENDPOINTS.INIT}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        code_verifier: codeVerifier,
      }),
    }
  );
  // Note: initResponse returns state (JWT) and session_id (short key) used for polling

  if (!initResponse.ok) {
    throw new Error(`Failed to fetch state: ${initResponse.status}`);
  }

  const { state, session_id: pollKey } = (await initResponse.json()) as { state: string; session_id: string };

  // 3. Build auth URL
  const redirectUri = `${OAUTH_SERVER_URL}${OAUTH_ENDPOINTS.CALLBACK}`;
  const scope = 'profile phone email hotel:order:read hotel:order:book hotel:order:cancel';
  const resource = `${MCP_BASE_URL}`;
  const authUrl = `${OAUTH_AUTHORIZE_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(codeChallenge)}&code_challenge_method=S256&scope=${encodeURIComponent(scope)}&resource=${encodeURIComponent(resource)}&prompt=consent`;

  // 4. Get short link (if ENABLE_SHORT_LINK=true)
  let shortUrl = authUrl;
  if (ENABLE_SHORT_LINK) {
    try {
      const shortResponse = await fetch(`${OAUTH_SERVER_URL}${SHORT_LINK_ENDPOINT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: authUrl }),
      });
      if (shortResponse.ok) {
        const { shortUrl: url } = (await shortResponse.json()) as { shortUrl: string };
        shortUrl = url;
      }
    } catch {
      // Short link service unavailable, fallback to long link
    }
  }

  // 5. Show auth guide
  console.log('┌─────────────────────────────────────────┐');
  console.log('│    Please authorize to continue      │');
  console.log('└─────────────────────────────────────────┘\n');

  console.log('Method 1: Scan QR Code with your phone\n');
  console.log(`![QR Code](https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shortUrl)})`);

  await new Promise((r) => setTimeout(r, 300));

  console.log('\nMethod 2: Click the link or copy to browser\n');
  console.log(`   ${shortUrl}\n`);
  console.log('Waiting for authorization... (will resume automatically)\n');

  // 4. Poll proxy server for token
  console.log('\nWaiting for user authorization and fetching token...');
  const tokenUrl = `${OAUTH_SERVER_URL}${OAUTH_ENDPOINTS.TOKEN}?session_id=${encodeURIComponent(pollKey)}`;

  const MAX_RETRIES = 150; // Max polling 5 minutes (150 * 2s)
  for (let i = 0; i < MAX_RETRIES; i++) {
    await new Promise((r) => setTimeout(r, 2000)); // Check every 2 seconds

    let result: { status: string; token?: any } | null = null;
    try {
      const tokenResponse = await fetch(tokenUrl);
      if (!tokenResponse.ok) continue; // Network issue, continue polling
      result = (await tokenResponse.json()) as { status: string; token?: any };
    } catch {
      // Swallow network layer errors only (timeout, DNS etc.), continue polling
      continue;
    }

    // Business logic outside try/catch to ensure expired can be thrown normally
    if (result.status === 'success' && result.token) {
      saveToken(result.token);
      console.log('Login successful! Token saved.\n');
      console.log('Token Info:');
      if (result.token.access_token) {
        console.log(`   Access Token: ${result.token.access_token.substring(0, 20)}...`);
      }
      if (result.token.expires_in) {
        console.log(`   Expires in: ${result.token.expires_in} seconds`);
      }
      return;
    }

    if (result.status === 'expired') {
      throw new Error('Authorization session expired, please run "rgg login" again.');
    }

    // pending: continue waiting
  }

  throw new Error('Authorization timeout, please run "rgg login" again.');
}
