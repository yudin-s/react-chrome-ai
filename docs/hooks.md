# Hook API Reference

This package gives React applications direct control over Chrome Built-in AI state. The hooks do not hide the browser API; they expose the parts that matter for UI: support, availability, user activation, download progress, session lifecycle, streaming chunks, context-window pressure, errors, and teardown.

Chrome owns the model files and may download, update, or purge them. Your UI should treat readiness and download progress as live state, not a one-time install step.

## Status Model

Most hooks expose a `status` field. Common values:

| Status | Meaning |
| --- | --- |
| `idle` | Nothing is running yet. |
| `checking` | The hook is reading browser/API availability. |
| `unsupported` | The browser does not expose this API. |
| `unavailable` | The API exists, but cannot run for this device, profile, origin, policy, or requested options. |
| `downloadable` | Chrome can download the model after user activation. |
| `downloading` | Chrome is downloading model resources. |
| `preparing` | Download reached completion or Chrome is extracting/loading the model. |
| `ready` | Session or task is ready, or the last operation completed. |
| `prompting` | A non-streaming model operation is running. |
| `streaming` | A streaming model operation is running and chunks may update. |
| `appending` | Context is being appended to an existing `LanguageModel` session. |
| `cloning` | A session clone is being created. |
| `aborted` | The current operation was cancelled with `AbortSignal` or session teardown. |
| `error` | The last operation failed. Inspect `error`. |

## Progress Model

Hooks that create sessions may expose `progress`:

```ts
interface ChromeAIDownloadProgress {
  loaded?: number;
  total?: number;
  progress?: number; // 0..1 when known
  percent?: number; // 0..100 when known
  indeterminate: boolean;
  completed: boolean;
}
```

Chrome may report fractional progress or byte progress depending on the API/version. When size is unknown, `indeterminate` is `true`; render an indeterminate progress indicator.

## Prompt / LLM Hooks

### `useChromeAIAvailability(options?)`

Checks the general LLM Prompt API (`LanguageModel`) without creating a session.

Use it to decide whether to show a local AI feature, a "prepare model" button, or setup instructions.

```tsx
const ai = useChromeAIAvailability({
  options: {
    expectedInputs: [{ type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }],
  },
});

if (!ai.supported) return <p>Chrome LanguageModel is not exposed.</p>;
if (ai.availability === "downloadable") return <button onClick={ai.refresh}>Check again</button>;
```

Returns:

- `supported`: whether `LanguageModel` or legacy `ai.languageModel` exists.
- `status`: `idle`, `checking`, `ready`, `unavailable`, or `error`.
- `availability`: Chrome availability state.
- `userActivation`: whether the page has recent user activation.
- `error`: last error.
- `refresh()`: re-runs availability detection.

### `useChromeAIParams(autoLoad?)`

Reads `LanguageModel.params()` when Chrome exposes sampling controls.

Use it in extension/origin-trial contexts where `temperature` and `topK` are available.

```tsx
const { params, status } = useChromeAIParams();

return status === "ready" ? (
  <span>Temperature max: {params?.maxTemperature}</span>
) : null;
```

### `useChromeAISession(options?)`

Creates and owns a `LanguageModel` session. It exposes download progress and destroys the session on unmount by default.

Use it when you want full lifecycle control: prepare early on a click, reuse a session for multiple prompts, then explicitly destroy it.

```tsx
const model = useChromeAISession({
  autoCreate: false,
  createOptions: {
    initialPrompts: [{ role: "system", content: "You are concise." }],
    expectedInputs: [{ type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }],
  },
});

return (
  <>
    <button onClick={() => model.createSession()}>Prepare local model</button>
    {model.progress && <progress value={model.progress.progress} />}
  </>
);
```

Returns:

- `session`: the native `LanguageModel` session or `null`.
- `status`, `availability`, `progress`, `error`.
- `createSession(overrideOptions?)`.
- `destroySession()`.

### `useChromeAIPrompt(options?)`

High-level hook for non-streaming prompts. It creates a session lazily unless one already exists.

Use it for commands, classification, short summaries, and JSON-shaped results.

```tsx
const ai = useChromeAIPrompt<{ label: string }>({
  reflection: {
    format: "json",
    schema: {
      type: "object",
      properties: { label: { type: "string" } },
      required: ["label"],
    },
  },
});

const result = await ai.promptStructured("Classify: Chrome AI downloads locally.");
console.log(result.data?.label);
```

Returns:

- prompt state: `status`, `text`, `data`, `chunks`, `input`, `error`.
- session/progress state: `session`, `progress`.
- `prompt(input, { signal })`.
- `promptStructured(input, options)`.
- `reset()`.

### `useChromeAIStream(session)`

Streams output from an existing `LanguageModel` session.

Use it when you expect long answers and want to render tokens/chunks as they arrive.

```tsx
const model = useChromeAISession();
const stream = useChromeAIStream(model.session);

await stream.streamPrompt("Explain Prompt API session management.");
```

Returns `status`, `text`, `chunks`, `error`, `streamPrompt()`, and `reset()`.

### `useChromeAIAppend(session)`

Wraps native `session.append()` for preloading additional context into an existing session.

Use it for multimodal or document workflows where you want Chrome to process context before the user asks a question.

```tsx
const append = useChromeAIAppend(model.session);

await append.append([
  {
    role: "user",
    content: [
      { type: "text", value: "Remember this image for the next question." },
      { type: "image", value: imageBlob },
    ],
  },
]);
```

Returns `status`, `error`, `append()`, and `reset()`.

### `useChromeAIClone(session)`

Wraps native `session.clone()` and owns clone teardown.

Use it to fork a conversation for speculative UI branches without mutating the parent session.

```tsx
const clone = useChromeAIClone(model.session);
const branch = await clone.cloneSession();
const answer = await branch.prompt("Answer with a stricter tone.");
```

Returns `status`, `clone`, `error`, `cloneSession()`, and `destroyClone()`.

### `useChromeAIContext(session, options?)`

Tracks Prompt API context-window state.

Use it to show context pressure, warn before overflows, or react to `contextoverflow`.

```tsx
const context = useChromeAIContext(model.session, { pollIntervalMs: 1000 });

return (
  <meter value={context.contextUsage ?? 0} max={context.contextWindow ?? 1} />
);
```

Returns `contextUsage`, `contextWindow`, `overflowed`, `refresh()`, and `resetOverflow()`.

## Generic Chrome Task Hooks

Chrome's task APIs share a lifecycle shape: `availability()`, `create({ monitor })`, then one or more task-specific methods. The generic hooks expose this lifecycle for any supported task API.

### `useChromeAITaskAvailability({ apiName, options, autoCheck })`

Checks readiness for a specific task API without creating a session.

```tsx
const summarizer = useChromeAITaskAvailability({
  apiName: "Summarizer",
  options: { expectedInputLanguages: ["en"], outputLanguage: "en" },
});
```

Supported `apiName` values:

- `LanguageModel`
- `Summarizer`
- `Translator`
- `LanguageDetector`
- `Writer`
- `Rewriter`
- `Proofreader`

### `useChromeAITaskSession({ apiName, createOptions, autoCreate })`

Creates and owns a task API session, with download progress.

Use it when you want direct access to the native task object.

```tsx
const translator = useChromeAITaskSession({
  apiName: "Translator",
  createOptions: { sourceLanguage: "es", targetLanguage: "en" },
});

await translator.createSession();
```

Returns `supported`, `availability`, `status`, `session`, `progress`, `error`, `createSession()`, and `destroySession()`.

### `useChromeAITaskOperation({ apiName, methodName, streaming, createOptions })`

Runs a task method and tracks result text/chunks.

Use it for experimental APIs or API methods that do not yet have a convenience wrapper.

```tsx
const operation = useChromeAITaskOperation<string>({
  apiName: "Summarizer",
  methodName: "summarize",
  createOptions: { type: "key-points", format: "markdown" },
});

await operation.run(articleText);
```

Set `streaming: true` when the method returns `ReadableStream<string>` or `AsyncIterable<string>`.

## Convenience Task Hooks

### `useChromeAISummarizer(options?)`

Creates/runs the Summarizer API. Use it to summarize articles, conversations, reviews, or reports.

```tsx
const summarizer = useChromeAISummarizer({
  createOptions: {
    type: "key-points",
    format: "markdown",
    length: "medium",
    expectedInputLanguages: ["en"],
    outputLanguage: "en",
  },
});

await summarizer.run(text);
```

Uses `summarize()` by default and `summarizeStreaming()` when `streaming: true`.

### `useChromeAITranslator(options?)`

Creates/runs the Translator API. Use it for local translation without sending text to a server.

```tsx
const translator = useChromeAITranslator({
  createOptions: { sourceLanguage: "ja", targetLanguage: "en" },
});

await translator.run("こんにちは");
```

Uses `translate()` by default and `translateStreaming()` when `streaming: true`.

### `useChromeAILanguageDetector(options?)`

Creates/runs the Language Detector API. Use it before translation or for language-aware UI.

```tsx
const detector = useChromeAILanguageDetector();
const detections = await detector.run("Bonjour tout le monde");
```

Uses `detect()`.

### `useChromeAIWriter(options?)`

Creates/runs the Writer API. Use it to generate new text from a task and optional shared context.

```tsx
const writer = useChromeAIWriter({
  createOptions: {
    tone: "formal",
    format: "plain-text",
    sharedContext: "Customer support email.",
  },
});

await writer.run("Ask for the account number politely.");
```

Uses `write()` by default and `writeStreaming()` when `streaming: true`.

### `useChromeAIRewriter(options?)`

Creates/runs the Rewriter API. Use it to shorten, expand, reformat, or change tone of existing text.

```tsx
const rewriter = useChromeAIRewriter({
  createOptions: {
    tone: "more-formal",
    format: "markdown",
    length: "shorter",
  },
});

await rewriter.run(draftText);
```

Uses `rewrite()` by default and `rewriteStreaming()` when `streaming: true`.

### `useChromeAIProofreader(options?)`

Creates/runs the Proofreader API. Use it for grammar, spelling, punctuation, and correction suggestions where Chrome exposes the API.

```tsx
const proofreader = useChromeAIProofreader();
const result = await proofreader.run("This are a test.");
```

Uses `proofread()`.

## Recommended UX Flow

1. Detect support with `useChromeAIAvailability` or `useChromeAITaskAvailability`.
2. Explain local processing and model download before starting creation.
3. Start `createSession()` from a user gesture.
4. Render `downloadable`, `downloading`, and `preparing` states explicitly.
5. Reuse sessions for repeated operations.
6. Destroy sessions when leaving the feature.
7. Validate structured output before mutating application state.
