---
name: Migration fixes
description: Key compatibility fixes applied during Replit migration for this project.
---

# Migration compatibility fixes

## jspdf blocked by Replit security policy
All versions of `jspdf` are blocked by Replit's Socket Security Policy. Removed it from `package.json` entirely and replaced usage in `invoice.tsx`, `resell.tsx`, and `inquiry.tsx` with browser-native `window.open` + `window.print()` approach (renders HTML into a new tab and triggers print dialog for PDF saving).

**Why:** Replit's security policy blocks the entire `jspdf` package at the registry level.

**How to apply:** If the user asks about PDF generation, use browser print API or suggest an alternative package like `@react-pdf/renderer`.

## date-fns v3 breaks Vite dep-scanner
`date-fns` v3.x has `"browser": "./index"` (missing `.js` extension) in its `package.json`, which causes Vite's esbuild dep-scanner to fail with "Failed to resolve entry for package" error. Both Vite 5 and Vite 7 are affected.

**Why:** The extensionless `browser` field confuses Vite/esbuild package resolution when combined with the `exports` field.

**How to apply:** Keep `date-fns` pinned to `^2.30.0` (v2.x). All v2 APIs (`format`, `parseISO`, `addMonths`, etc.) are identical to what the codebase uses.
