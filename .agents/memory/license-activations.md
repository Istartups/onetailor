---
name: License activations must be recorded for stats
description: When creating a license anywhere in the codebase, a licenseActivationsTable record must also be inserted or the admin stats activations count stays 0.
---

## Rule
Whenever a license is created, also insert into `licenseActivationsTable`:
```js
const [newLicense] = await db.insert(licensesTable).values({...}).returning();
if (newLicense) {
  try {
    await db.insert(licenseActivationsTable).values({
      licenseId: newLicense.id,
      deviceId: deviceId || "fallback-source"
    });
  } catch (e) {}
}
```

## Why
The admin stats endpoint counts activations from `licenseActivationsTable`. The three license-creation paths (manual approve, Paystack webhook, Paystack verify) did not insert activation records, causing activations to always show 0.

## How to apply
Use `.returning()` on the license insert to get the id, then insert the activation. Wrap in try/catch so activation record failure doesn't abort the license creation.
