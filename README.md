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
