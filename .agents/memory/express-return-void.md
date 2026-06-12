---
name: Express 5 async handler return pattern
description: Use `return void res.json(...)` not `return res.json(...)` to avoid TS7030 errors in async Express route handlers.
---

## Rule
In Express 5 async route handlers, early-exit responses must use:
```js
return void res.status(400).json({ message: "..." });
// NOT:
return res.status(400).json({ message: "..." });
```

## Why
`res.json()` returns the `Response` object. When you `return res.json(...)` in some paths but not others, TypeScript infers `Promise<Response | undefined>` as the return type and raises TS7030 ("Not all code paths return a value"). Using `return void res.json(...)` makes all paths return `undefined`, fixing the error.

## How to apply
A global sed can fix an entire file: `sed -i 's/return res\./return void res./g' <file>`.
