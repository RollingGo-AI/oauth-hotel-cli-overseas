# AGENTS.md

RollingGo Hotel CLI (Global edition) — `@rollinggo/hotel-global`, binary `rgg`. TypeScript ESM + commander, no tests, no lint. Code comments and user-facing output are English — keep that style.

## Mirror of the domestic CLI

`oauth-hotel-cli` (`@rollinggo/hotel` / `rgh`) is this project's mirror with an identical layout; changes usually must be replicated to the other side:

| | Global (this repo) | Domestic |
|---|---|---|
| OAuth callback | `/global-skill/oauth/callback` | `/skill/oauth/callback` |
| MCP default | `https://mcp.rollinggo.ai/mcp` | `https://mcp.rollinggo.cn/mcp` |
| Auth page default | `https://api.rollinggo.ai/oauth2/authorize` | `https://api.rollinggo.cn/oauth2/authorize` |
| Default CLIENT_ID | `rollinggoglobal` | `rollinggoskill` |
| Global config dir | `~/.hotel-global-cli/` | `~/.hotel-cli/` |
| Default country/currency | US / USD | CN / CNY |
| Branch | `main` | `master` |
| `book` command | `--customer-request`, no email | requires `--email` |

## Layout

- `src/index.ts` — commander entrypoint, all command definitions and param assembly (incl. the `.env` upward-search loader)
- `src/auth.ts` — PKCE OAuth login: generate code_verifier (32B base64url) + session_id, POST `/skill/oauth/init` for state, build auth URL via `/s/shorten` short link, then poll `/skill/oauth/token?session_id=...` every 2s (max 150 ≈ 5 min) and save the token file on success
- `src/api.ts` — all MCP calls use `Authorization: Bearer` from `loadToken()`; throws if not logged in
- `src/constants.ts` — all endpoints/defaults/`TOKEN_PATH` (`~/.hotel-global-cli/token.json`); change config here
- `src/version-check.ts` — startup npm registry version check (failures silently ignored)

## Env vars (load order: system > CWD upward > script dir upward [Skill dir] > global home)

`MCP_BASE_URL`, `OAUTH_SERVER_URL` (default `https://rollinggo.store` proxy), `OAUTH_AUTHORIZE_URL`, `CLIENT_ID`. Defaults are hardcoded in `constants.ts`. The `init` command writes `~/.hotel-global-cli/.env`.

## Commands

- `npm run build` — `tsc` (outputs `dist/`, ESM)
- `npm run dev` — **gotcha**: runs `node --watch dist/index.js`, so `npm run build` first
- `npm start` — `node dist/index.js`
- Local check: `npm run build && node dist/index.js --help`

## Publishing (GitHub Actions does it — never publish locally)

1. Commit (repo history uses `fix:`/`feat:` style, plus bare version commits like `1.0.8`)
2. `npm version patch|minor|major` (bumps package.json and creates the `v*` tag)
3. `git push origin main --follow-tags`
4. `.github/workflows/release.yml` then publishes to npm and compiles `rgg-*` binaries for 4 platforms via Bun, attaching them to a GitHub Release

`dist/` and `.env` are gitignored; don't commit them.
