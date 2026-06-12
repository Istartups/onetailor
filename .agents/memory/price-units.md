---
name: Price units — Naira not kobo
description: Clarifies that payment amounts in OneTailor are stored in Naira (whole units), not kobo, and documents the correct display and Paystack conversion.
---

## Rule
Payment amounts (the `price` field in `payment_settings` and the `amount` field in `payments`) are stored in **Naira** (whole units). Do NOT divide by 100 when displaying.

## Why
The DB default is 15000 (= ₦15,000 NGN). The Paystack initialize route already multiplies by 100 (`amount * 100`) when sending to the Paystack API to convert to kobo. The Paystack webhook stores `amount / 100` (converting from kobo back to Naira). Manual payments store `parseInt(amount)` directly from the PWA, which sends the price as-is.

## How to apply
- Admin `Payment.tsx` formatPrice: `format(p)` not `format(p / 100)`.
- `PaymentSettings.tsx` label: "in Naira (e.g. 15000 = ₦15,000)".
- Paystack init: `amount * 100` for the Paystack API call is correct.
- Paystack webhook: `amount / 100` store is correct (converts from kobo to Naira).
