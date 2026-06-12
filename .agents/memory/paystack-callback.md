---
name: Paystack callback URL must include /api prefix
description: The callback_url for Paystack initialization must include the /api path prefix or the verify redirect will 404.
---

## Rule
The `callback_url` in the Paystack initialize payload must be:
```
`${req.protocol}://${req.get("host")}/api/payment/paystack/verify`
```
NOT `/payment/paystack/verify`.

## Why
All API routes are mounted at `/api`. Without the prefix, Paystack redirects users to the static frontend route `/payment/paystack/verify` which doesn't exist, silently breaking the payment verification flow.
