---
name: Shimmed packages and type declarations
description: @ffmpeg/*, @xenova/transformers are shimmed via Vite aliases. Type declarations live in artifacts/one-tailor/src/global.d.ts.
---

## Rule
The packages `@ffmpeg/ffmpeg`, `@ffmpeg/util`, and `@xenova/transformers` are blocked by the package firewall and shimmed via Vite aliases in `artifacts/one-tailor/vite.config.ts`. TypeScript declarations for them live in `artifacts/one-tailor/src/global.d.ts`.

## Why
These ML/video packages cannot be installed (package firewall 403). Vite aliases redirect imports to lightweight shims so the build succeeds. TypeScript still needs `declare module` stubs so tsc doesn't error on the imports.

## How to apply
If you add a new use of these packages, add methods to the existing `global.d.ts` declarations. Do NOT attempt to install these packages.
