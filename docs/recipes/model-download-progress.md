# Recipe: Model Download Progress

Use `useChromeAISession` when your UI needs explicit model preparation and progress.

```tsx
import { useChromeAISession } from "@yudin-s/react-chrome-ai";

export function PrepareModelButton() {
  const model = useChromeAISession({ autoCreate: false });

  return (
    <section>
      <button onClick={() => model.createSession()}>
        Prepare local model
      </button>
      <p>Status: {model.status}</p>
      {model.progress?.progress != null ? (
        <progress value={model.progress.progress} max={1} />
      ) : model.status === "downloading" ? (
        <progress />
      ) : null}
      {model.error && <p role="alert">{model.error.message}</p>}
    </section>
  );
}
```

Call `createSession()` from a click/tap/key handler when possible. Chrome may require user activation before starting model preparation.
