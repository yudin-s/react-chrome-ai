# npm Publishing Preparation

This document captures the publication choices for `@yudin-s/react-chrome-ai`.

## Package Positioning

The package should be positioned as:

- React-first hooks for Chrome Built-in AI.
- Browser-native, privacy-oriented, no API keys.
- Full lifecycle control: readiness, download progress, session ownership, streaming, and teardown.
- Complementary to AI SDK provider packages rather than a replacement for them.

Good npm search terms are included in `package.json`: `react`, `hooks`, `chrome-ai`, `built-in-ai`, `browser-ai`, `gemini-nano`, `prompt-api`, `language-model`, `on-device-ai`, `summarizer`, and `translator`.

## Best Practices Applied

- ESM and CJS builds are both published.
- Type declarations are generated and exported.
- `exports` is explicit to avoid accidental deep imports.
- `sideEffects: false` enables tree-shaking.
- React is a peer dependency.
- Package contents are controlled with `files`.
- `llms.txt`, agent guidance, and copy-paste examples are included for AI-agent discoverability.
- `publishConfig.access` is `public` for the scoped package.
- `publishConfig.provenance` is enabled.
- CI runs typecheck, tests, build, and dry-pack.
- `prepublishOnly` runs `publish:check`.
- `npm audit` is clean at the time of preparation.
- README includes install, quick start, coverage, docs links, and prior art.

## Pre-Publish Checklist

Run:

```bash
npm install
npm run check
npm test
npm run build
npm audit --audit-level=moderate
npm run pack:dry
```

Inspect package contents:

```bash
npm --cache ./.npm-cache pack --dry-run --json
```

Optional compatibility checks before the first public release:

```bash
npx publint
npx @arethetypeswrong/cli --pack .
```

These checks require temporary network downloads unless added as dev dependencies.

## Publishing Options

### Recommended: Trusted Publishing From GitHub Actions

Use npm trusted publishing when the GitHub repository is public and configured as a trusted publisher in npm.

Benefits:

- no long-lived npm token in GitHub secrets;
- npm publishes provenance attestations automatically;
- safer release audit trail.

Suggested flow:

1. Create the GitHub repository matching `package.json`.
2. Configure npm trusted publishing for the package and release workflow.
3. Tag a release, for example `v0.1.0`.
4. Let GitHub Actions publish with `npm publish --access public --provenance`.

### Manual First Publish

If publishing manually:

```bash
npm login
npm publish --access public --provenance
```

Use npm 2FA for publish/settings changes.

## First Release Notes

Suggested release title:

```text
v0.1.0 - React hooks for Chrome Built-in AI
```

Suggested summary:

```text
Initial release with React hooks for Chrome LanguageModel / Gemini Nano and Chrome Built-in AI task APIs. Includes model availability checks, download progress, session lifecycle, prompt/streaming helpers, structured output, reflection, context tracking, and wrappers for Summarizer, Translator, Language Detector, Writer, Rewriter, and Proofreader.
```
