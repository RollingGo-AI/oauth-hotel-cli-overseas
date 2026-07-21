# @rollinggo/hotel-global

RollingGo Hotel CLI - OAuth login and hotel booking workflow for global users.

## Support

- OAuth 2.0 Login via short link or QR code.
- Full hotel booking workflow (Search -> Detail -> Price Confirm -> Book).
- Direct MCP integration.

## Installation

We recommend installing globally:

```bash
npm install -g @rollinggo/hotel-global@latest
```

## Configuration

The CLI automatically searches for and loads `.env` configuration files in the following order of priority (highest to lowest):

1. **System Environment Variables** (highest priority)
2. **Current Working Directory (CWD)**: The directory where you execute the CLI and its parent directories (recursively upwards).
3. **CLI Executable Path** (**Highly recommended for Skill Developers**): The directory where the CLI is physically installed, and recursively upwards. (This allows bundled AI Agent Skills to load configurations directly from the Skill's folder).
4. **Global Home Directory**: `~/.hotel-cli/.env`.

### Recommended Setup:

* **Scenario A: As a bundled AI Agent Skill (Recommended)**
  Place the `.env` file directly at the **root of your Skill directory** (the folder containing `SKILL.md`). This makes the Skill configuration portable so it works out-of-the-box when shared or copied.
  
* **Scenario B: As a global CLI tool**
  If you are running the `rgg` command globally, place the `.env` file in the **global configuration directory**:
  * **macOS / Linux**: `~/.hotel-global-cli/.env`
  * **Windows**: `C:\Users\<Your_Username>\.hotel-global-cli\.env`

* **Scenario C: Local Development**
  Place the `.env` file directly in the root of the CLI project directory.

### `.env` File Template:

```env
# MCP API Base URL
MCP_BASE_URL=https://mcp.rollinggo.cn/mcp

# OAuth Proxy Server URL
OAUTH_SERVER_URL=https://rollinggo.store

# OAuth Authorization Page URL
OAUTH_AUTHORIZE_URL=https://api.rollinggo.cn/oauth2/authorize

# OAuth Client ID
CLIENT_ID=rollinggo-skill
```

## Authentication

### 1. Login
```bash
rgg login
```
Follow the console instructions to either scan the QR code or click the URL to authorize.

### 2. Log out
```bash
rgg logout
```

### 3. Check login status
```bash
rgg whoami
```

## Hotel Commands

### 1. Get search tags
```bash
rgg hotel-tags
```

### 2. Search hotels
```bash
rgg search-hotels --origin-query "hotels near West Lake" --place "West Lake" --place-type attraction
```

### 3. Hotel detail
```bash
rgg hotel-detail --hotel-id 12345 --check-in-date 2026-08-01 --check-out-date 2026-08-03
```

### 4. Price confirm
```bash
rgg price-confirm --hotel-id 12345 --rate-plan-id "RP001" --rooms 1 --check-in-date 2026-08-01 --check-out-date 2026-08-03 --adults 2
```

### 5. Create booking
```bash
rgg book --reference-no "REF12345" --first-name "John" --last-name "Doe" --customer-request "Late check-in"
```

### 6. Search orders
```bash
rgg orders
```
