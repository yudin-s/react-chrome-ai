# Development Plan

## Research Summary

Chrome Built-in AI now exposes a family of browser APIs. For this package, the primary target is the Prompt API / `LanguageModel`, because it is the general LLM surface used for Gemini Nano-style browser-side prompting.

Official Chrome docs show these relevant capabilities:

- API detection through `LanguageModel` and legacy/experimental `ai.languageModel` compatibility.
- Availability states: `unavailable`, `downloadable`, `downloading`, `available`.
- Model preparation through `LanguageModel.create({ monitor })` and `downloadprogress`.
- Session calls: `prompt()`, `promptStreaming()`, `append()`, `clone()`, `destroy()`.
- Session state: `contextUsage`, `contextWindow`, and `contextoverflow` events.
- Prompt options: `signal`, `responseConstraint`, `omitResponseConstraintInput`.
- Session options: `initialPrompts`, `expectedInputs`, `expectedOutputs`, `topK`, `temperature`.
- Modalities: text input, image input, audio input, text output.

Existing package landscape:

- `@built-in-ai/core`: strongest existing package for AI SDK users. It wraps Chrome/Edge built-in models as a Vercel AI SDK provider and includes progress helpers. It is not React-hook-first.
- `simple-chromium-ai`: simple TypeScript wrapper with a safe result style. Good minimal API, but not designed around React state, streaming UI, or Chrome's newer structured-output/session controls.
- `@types/dom-chromium-ai`: useful type package, but application packages still need runtime handling.
- Generic Gemini packages mostly target the cloud Gemini API and are not relevant for browser-owned Gemini Nano.

PullScope reusable patterns:

- Feature detection should check both `globalThis.LanguageModel` and `globalThis.ai?.languageModel`.
- `availability(options)` should retry without options because Chrome versions differ in option support.
- Downloads must be explicit and visible; review/prompt calls should not silently hide first-run downloads.
- Progress needs normalized UI state because Chrome may report bytes or fractional loaded values.
- Browser-native providers should stay separate from HTTP/OpenAI-compatible providers.

## Package Scope

The package should stay small and composable:

- Core TypeScript helpers do all direct interaction with Chrome.
- React hooks own UI state and session lifecycle.
- Reflection helpers are opt-in and validation-friendly.
- No bundled schema validator, AI SDK dependency, backend fallback, or remote model calls.
- The first release covers `LanguageModel` deeply and exposes a generic task API layer for Chrome's other built-in AI APIs.

## Hook Surface

Initial public hooks:

- `useChromeAIAvailability`: feature detection, user activation hint, availability refresh.
- `useChromeAIParams`: sampling parameter discovery when available.
- `useChromeAISession`: create/destroy session, progress state, availability state.
- `useChromeAIPrompt`: request-style prompt and structured prompt with optional reflection.
- `useChromeAIStream`: streaming output for an existing session.
- `useChromeAIAppend`: pre-append text/image/audio context to an existing session.
- `useChromeAIClone`: fork an existing session and own clone teardown.
- `useChromeAIContext`: track context-window usage and `contextoverflow`.
- `useChromeAITaskAvailability`: generic readiness for any Chrome AI task API.
- `useChromeAITaskSession`: generic `availability/create/monitor/destroy` for task APIs.
- `useChromeAITaskOperation`: generic method runner for task APIs with optional streaming.
- `useChromeAISummarizer`, `useChromeAITranslator`, `useChromeAILanguageDetector`, `useChromeAIWriter`, `useChromeAIRewriter`, `useChromeAIProofreader`: convenience wrappers.

Planned hooks:

- `useChromeAIDoctor`: PullScope-style diagnostics with actionable setup rows.

## Release Checklist

1. Keep package exports stable and tree-shakeable.
2. Run `npm run check`, `npm test`, `npm run build`, and `npm run pack:dry`.
3. Add CI for install, typecheck, tests, build, and dry-pack.
4. Validate in real Chrome with a button-triggered `createSession()` flow.
5. Publish with provenance enabled:

```bash
npm publish --access public --provenance
```

## Open Questions

- Whether the final npm scope should remain `@yudin-s/react-chrome-ai` or move to an organization scope.
- Whether to add first-class adapters for Summarizer/Writer/Rewriter later, or keep this package strictly focused on `LanguageModel`.
- Whether to depend on `@types/dom-chromium-ai` once the browser API stabilizes enough to avoid local conservative types.
