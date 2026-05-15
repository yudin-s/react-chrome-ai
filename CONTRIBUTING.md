# Contributing

Thanks for helping make browser-side AI easier to use from React.

## Local Setup

```bash
npm install
npm run check
npm test
npm run build
```

## Guidelines

- Keep browser-native AI code in `src/runtime.ts`.
- Keep React state and lifecycle logic in `src/hooks.ts`.
- Do not add server, cloud model, or API key behavior to this package.
- Treat Chrome API changes as compatibility work: prefer additive types and graceful feature detection.
- Add focused tests for fallback behavior, progress normalization, and prompt helpers.

## Manual Chrome Testing

Use a real desktop Chrome tab. Trigger `createSession()` from a click or key event when testing model download, because Chrome may require user activation.
