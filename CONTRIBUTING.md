# Contributing

Issues and pull requests are welcome.

```bash
npm install
npm run dev     # local dev server
npm test        # unit tests (the calculation engine and the form state)
npm run build   # type-check and production build
```

- The calculation engine in `src/core/` must stay pure and deterministic: same input, same plan, no browser or React imports.
- Every rule is covered by a test in `src/core/__tests__/`. If you change a number, change the test and say in the PR which source supports it.
- All user-facing text is in `src/messages/en.json`.
- This is health-related guidance. Changes that remove or weaken a safety warning will not be merged without a published source.
