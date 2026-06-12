---
name: Drizzle dynamic query typing
description: Drizzle omits .where() from some chained select types; use `let query: any` for conditionally-filtered queries.
---

## Rule
When building a Drizzle query that may or may not have a `.where()` appended based on runtime conditions, declare the variable as `any`:
```js
let query: any = db.select({...}).from(table);
if (condition) {
  query = query.where(condition);
}
```

## Why
Drizzle's inferred type after `.from(table)` is `Omit<PgSelectBase<...>, "where">` in some cases, which TypeScript reports as missing the `.where` method when you try to conditionally chain it. The `as any` cast on the right side of the assignment doesn't help because the left-side type was already inferred.

## How to apply
Only applies to `let`-reassigned queries with optional `.where` chaining. Direct chains like `db.select().from(table).where(condition)` work fine without `any`.
