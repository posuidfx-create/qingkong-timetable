---
name: frontend-quality
description: Implement, refactor, test, or review this project's React and strict TypeScript frontend architecture. Use when changing application code, state, domain logic, storage, parsers, tests, or build configuration and engineering quality must be preserved across Vite, Tailwind CSS, shadcn/ui, Zustand, and Vitest.
---

# Frontend Quality

Maintain a modular React application with strict TypeScript and clear separation between presentation, state, infrastructure, and domain logic.

## Stack and structure

- Use React, strict TypeScript, Vite, Tailwind CSS, shadcn/ui, Zustand, and Vitest.
- Do not concentrate the application in `App.tsx`.
- Organize code by responsibility under `components`, `pages`, `store`, `lib`, `hooks`, and `types`; add domain-specific subdirectories when useful.
- Avoid `any`, unsafe casts, and suppressions that conceal type errors. Define explicit domain types.

## Separation and reuse

- Keep UI components separate from business logic.
- Keep parsers and storage adapters independent of React.
- Implement date calculations, week calculations, and conflict detection as pure functions where practical.
- Make complex or failure-prone logic directly testable without rendering React.
- Search for an existing implementation before adding logic, and reuse or extend the appropriate stable module.
- Read the relevant files and tests before editing them.
- Do not rewrite a stable module without a concrete reason; prefer the smallest coherent change.

## Validation workflow

After a substantial task, run:

```text
npm run lint
npm run typecheck
npm run test
npm run build
```

When a command fails, read the full error, identify the root cause, make a focused correction, and rerun the affected command plus any downstream checks. Do not announce completion while a known TypeScript or build error remains. If a required command is unavailable or blocked, report the exact limitation instead of claiming validation passed.
