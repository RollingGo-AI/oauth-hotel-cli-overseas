
// ==================== API URLs ====================

/** MCP Base URL */
export const MCP_BASE_URL = process.env.MCP_BASE_URL || 'https://mcp.rollinggo.ai/mcp';

/** OAuth Proxy server URL */
export const OAUTH_SERVER_URL = process.env.OAUTH_SERVER_URL || 'https://rollinggo.store';

/** OAuth Auth page URL */
export const OAUTH_AUTHORIZE_URL = process.env.OAUTH_AUTHORIZE_URL || 'https://api.rollinggo.ai/oauth2/authorize';

/** OAuth Client ID */
export const CLIENT_ID = process.env.CLIENT_ID || 'rollinggo-global';

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
  /** Default country code */
  COUNTRY_CODE: 'US',
  /** Default currency */
  CURRENCY: 'USD',
  /** Default nationality */
  NATIONALITY: 'US',
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
