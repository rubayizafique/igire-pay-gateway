# IgirePay Idempotency Gateway

A RESTful API that ensures payments are processed exactly once, even when clients retry requests.

## Architecture Diagram

Client → POST /process-payment
↓
Check Idempotency-Key
↓
┌── Key missing? → 400 Error
├── New key? → Process Payment → Save → 201 Created
├── Same key + same body? → Return cached → 201 + X-Cache-Hit: true
├── Same key + different body? → 422 Error
└── Key in-flight? → Wait → Return result

## Setup Instructions

1. Clone the repository:
   git clone https://github.com/YOUR-USERNAME/igire-pay-gateway.git

2. Install dependencies:
   npm install

3. Start the server:
   npm start

4. Run tests:
   npm test

## API Documentation

### POST /process-payment

**Headers:**
- `Idempotency-Key`: unique string (required)

**Request Body:**
```json
{
  "amount": 100,
  "currency": "GHS"
}
```

**Responses:**

| Status | Meaning |
|--------|---------|
| 201 | Payment processed successfully |
| 400 | Missing Idempotency-Key header |
| 422 | Key reused with different request body |

**Example first request:**
```json
{
  "message": "Charged 100 GHS",
  "transactionId": "TXN-1234567890",
  "amount": 100,
  "currency": "GHS",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Example duplicate request:**
- Returns same response as first request
- Includes header: `X-Cache-Hit: true`

### GET /health

Returns server status.

```json
{ "status": "OK", "message": "Server is running" }
```

## Design Decisions

- **In-memory store:** Used a JavaScript Map for simplicity. In production, Redis would be used for persistence across server restarts.
- **2 second delay:** Simulates real payment processing time.
- **In-flight guard:** Prevents race conditions when two identical requests arrive simultaneously.
- **Body comparison:** Uses JSON.stringify to compare request bodies and detect fraud attempts.

## Developer's Choice: Request Body Validation

Added validation to reject requests missing `amount` or `currency` fields. This prevents incomplete payments from being processed and cached, which would cause problems in a real fintech system.

## Tech Stack

- Node.js
- Express.js
- Jest (testing)
- Supertest (HTTP testing)