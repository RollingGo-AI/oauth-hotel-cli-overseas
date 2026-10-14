
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Recursively search upwards for specific filenames (e.g. client_id.txt or .client_id)
function findFileUpwards(startDir: string, filenames: string[]): string | null {
  try {
    let dir = path.resolve(startDir);
    while (true) {
      for (const name of filenames) {
        const target = path.join(dir, name);
        if (fs.existsSync(target) && fs.statSync(target).isFile()) {
          return target;
        }
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {}
  return null;
}

// Cross-drive support: Scan user home directory for known AI Agent Skill directories
function findFileInHomeSkillDirs(filenames: string[]): string | null {
  try {
    const homedir = os.homedir();
    const baseDirs = [
      path.join(homedir, '.hotel-global-cli'),
      path.join(homedir, '.claude', 'skills'),
      path.join(homedir, '.gemini', 'config', 'skills'),
      path.join(homedir, '.gemini', 'skills'),
      path.join(homedir, '.cursor', 'skills'),
      path.join(homedir, '.openclaw', 'skills'),
      path.join(homedir, '.agents', 'skills'),
    ];

    for (const base of baseDirs) {
      if (!fs.existsSync(base)) continue;
      for (const name of filenames) {
        const direct = path.join(base, name);
        if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
          return direct;
        }
      }
      try {
        const subdirs = fs.readdirSync(base, { withFileTypes: true });
        for (const sub of subdirs) {
          if (sub.isDirectory()) {
            for (const name of filenames) {
              const subTarget = path.join(base, sub.name, name);
              if (fs.existsSync(subTarget) && fs.statSync(subTarget).isFile()) {
                return subTarget;
              }
            }
          }
        }
      } catch {}
    }
  } catch {}
  return null;
}

// ==================== API URLs ====================

/** MCP Base URL */
export const getMcpBaseUrl = () => process.env.MCP_BASE_URL || 'https://mcp.rollinggo.ai/mcp';

/** OAuth Proxy server URL */
export const getOauthServerUrl = () => {
  const url = process.env.OAUTH_SERVER_URL;
  if (url && /https?:\/\/rollinggo\.store\/?$/i.test(url.trim())) {
    return 'https://api.rollinggo.store';
  }
  return url || 'https://api.rollinggo.store';
};

/** OAuth Auth page URL */
export const getOauthAuthorizeUrl = () => process.env.OAUTH_AUTHORIZE_URL || 'https://api.rollinggo.ai/oauth2/authorize';

/**
 * OAuth Client ID Tiered Resolution:
 * 1. CLI explicit argument (--client-id)
 * 2. CWD and parent directories client_id.txt or .client_id
 * 3. Script directory and parent directories client_id.txt or .client_id
 * 4. Environment variable process.env.CLIENT_ID (including ~/.hotel-global-cli/.env)
 * 5. Default built-in: 'rollinggoglobal'
 */
export const getClientId = (cliOverride?: string): string => {
  // Priority 1: CLI explicit argument
  if (cliOverride && cliOverride.trim()) {
    return cliOverride.trim();
  }

  // Priority 2: CWD search upwards for client_id.txt / .client_id
  const cwdFile = findFileUpwards(process.cwd(), ['client_id.txt', '.client_id']);
  if (cwdFile) {
    try {
      const content = fs.readFileSync(cwdFile, 'utf8').trim();
      if (content) return content;
    } catch {}
  }

  // Priority 3: Cross-drive support: Scan user home directory for AI skill client_id.txt / .client_id
  const homeSkillFile = findFileInHomeSkillDirs(['client_id.txt', '.client_id']);
  if (homeSkillFile) {
    try {
      const content = fs.readFileSync(homeSkillFile, 'utf8').trim();
      if (content) return content;
    } catch {}
  }

  // Priority 4: Script directory search upwards
  try {
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const scriptFile = findFileUpwards(scriptDir, ['client_id.txt', '.client_id']);
    if (scriptFile && scriptFile !== cwdFile && scriptFile !== homeSkillFile) {
      const content = fs.readFileSync(scriptFile, 'utf8').trim();
      if (content) return content;
    }
  } catch {}

  // Priority 4: Environment variable / .env
  if (process.env.CLIENT_ID && process.env.CLIENT_ID.trim()) {
    return process.env.CLIENT_ID.trim();
  }

  // Priority 5: Default built-in
  return 'rollinggoglobal';
};

// ==================== API Endpoints ====================

export const API_ENDPOINTS = {
  /** Get search tags */
  HOTEL_TAGS: '/hoteltags',
  /** Search hotels */
  HOTEL_SEARCH: '/hotelsearch',
  /** Hotel detail */
  HOTEL_DETAIL: '/hoteldetail',
  /** Price confirm */
  PRICE_CONFIRM: '/hotelpriceconfirm',
  /** Create booking */
  HOTEL_BOOK: '/hotelbook',
  /** Search orders */
  HOTEL_ORDERS: '/hotelorders',
  /** Order detail */
  HOTEL_ORDER_DETAIL: '/hotelorderdetail',
  /** Pre-cancel booking (query penalty and get confirmId) */
  HOTEL_PRE_CANCEL: '/hotelprecancel',
  /** Confirm cancel booking */
  HOTEL_CONFIRM_CANCEL: '/hotelcancelconfirm',
} as const;

// ==================== OAuth Endpoints ====================

export const OAUTH_ENDPOINTS = {
  /** Get state */
  INIT: '/skill/oauth/init',
  /** OAuth Callback (Overseas edition path, maps to rollinggo-global client) */
  CALLBACK: '/global-skill/oauth/callback',
  /** Get token */
  TOKEN: '/skill/oauth/token',
} as const;

// ==================== Short link endpoint ====================

export const SHORT_LINK_ENDPOINT = '/s/shorten';



// ==================== Place types ====================

export const PLACE_TYPES = [
  'city',
  'airport',
  'point_of_interest',
  'train_station',
  'subway_station',
  'hotel',
  'district/county',
  'detailed address',
] as const;

export type PlaceType = (typeof PLACE_TYPES)[number];

// ==================== Default values ====================

export const DEFAULTS = {
  /** Default response size */
  SIZE: 5,
  /** Max response size */
  MAX_SIZE: 20,
  /** Default stay nights */
  STAY_NIGHTS: 1,
  /** Default adult count */
  ADULT_COUNT: 2,
  /** Default child count */
  CHILD_COUNT: 0,
  /** Default room count */
  ROOM_COUNT: 1,
  /** Default currency */
  CURRENCY: 'USD',
  /** Default language */
  LANGUAGE: 'en',
} as const;

// ==================== OAuth Config ====================

export const OAUTH_CONFIG = {
  /** Local callback port */
  LOCAL_PORT: 18900,
  /** PKCE code_verifier length */
  CODE_VERIFIER_LENGTH: 128,
  /** State expiration time (minutes) */
  STATE_EXPIRY_MINUTES: 10,
} as const;

// ==================== Token Storage ====================

export const TOKEN_PATH = process.env.HOME
  ? `${process.env.HOME}/.hotel-global-cli/token.json`
  : `${process.env.USERPROFILE}/.hotel-global-cli/token.json`;
