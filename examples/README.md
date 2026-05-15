# Example Sites

These examples are intentionally larger than snippets. They show how a real React UI can handle Chrome Built-in AI support detection, availability, model download progress, session lifecycle, streaming, task APIs, error states, and teardown.

## Sites

| Example | Focus |
| --- | --- |
| [`chrome-ai-studio`](./chrome-ai-studio) | Full LanguageModel control: readiness, model preparation, download progress, prompt, streaming, context usage. |
| [`local-review-workbench`](./local-review-workbench) | Structured JSON output, reflection, local review workflow, summarization task API. |
| [`local-translator`](./local-translator) | Translator and LanguageDetector task APIs. |

## Run An Example

From an example folder:

```bash
npm install
npm run dev
```

The examples depend on the package through `file:../..`, so they use the local workspace build.

Use a Chrome build that exposes the relevant Built-in AI API. Start model preparation from a click/tap button so Chrome can satisfy user activation requirements.
