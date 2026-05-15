import { useMemo, useState } from "react";
import {
  useChromeAIAvailability,
  useChromeAIContext,
  useChromeAIParams,
  useChromeAISession,
  useChromeAIStream,
} from "@yudin-s/react-chrome-ai";

const prompts = [
  "Explain what Chrome Built-in AI changes for privacy-sensitive React apps.",
  "Draft a compact onboarding checklist for enabling local model features.",
  "List three UX states a browser-native AI app must handle.",
];

export function App() {
  const [prompt, setPrompt] = useState(prompts[0]);
  const readiness = useChromeAIAvailability();
  const params = useChromeAIParams();
  const model = useChromeAISession({
    autoCreate: false,
    createOptions: {
      initialPrompts: [
        {
          role: "system",
          content:
            "You are a concise local assistant. Be practical, specific, and avoid unsupported claims.",
        },
      ],
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    },
  });
  const stream = useChromeAIStream(model.session);
  const context = useChromeAIContext(model.session, { pollIntervalMs: 1000 });

  const contextPercent = useMemo(() => {
    if (!context.contextWindow || !context.contextUsage) return 0;
    return Math.min(100, Math.round((context.contextUsage / context.contextWindow) * 100));
  }, [context.contextUsage, context.contextWindow]);

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">React Chrome AI example</p>
          <h1>Chrome AI Studio</h1>
        </div>
        <a href="https://developer.chrome.com/docs/ai/prompt-api">Prompt API docs</a>
      </header>

      <section className="status-grid">
        <StatusTile label="API support" value={readiness.supported ? "Supported" : "Not exposed"} />
        <StatusTile label="Availability" value={readiness.availability ?? readiness.status} />
        <StatusTile label="Session" value={model.status} />
        <StatusTile label="User activation" value={readiness.userActivation ? "Present" : "Needed"} />
      </section>

      <section className="workspace">
        <aside className="panel">
          <h2>Model Control</h2>
          <p className="muted">
            Prepare the model from a click. Chrome may use this step to download or load browser-managed model files.
          </p>
          <button onClick={() => model.createSession()} disabled={model.status === "checking" || model.status === "downloading"}>
            Prepare Model
          </button>
          <button className="secondary" onClick={model.destroySession} disabled={!model.session}>
            Destroy Session
          </button>

          <div className="progress-block">
            <div>
              <strong>Download</strong>
              <span>{model.progress?.percent != null ? `${model.progress.percent}%` : model.status}</span>
            </div>
            {model.progress?.progress != null ? (
              <progress value={model.progress.progress} max={1} />
            ) : (
              <progress />
            )}
          </div>

          <div className="meter">
            <div>
              <strong>Context</strong>
              <span>{contextPercent}%</span>
            </div>
            <meter value={context.contextUsage ?? 0} max={context.contextWindow ?? 1} />
            {context.overflowed && <p role="alert">Context overflow was reported by Chrome.</p>}
          </div>

          <dl>
            <dt>Top K</dt>
            <dd>{params.params?.defaultTopK ?? "unknown"}</dd>
            <dt>Temperature</dt>
            <dd>{params.params?.defaultTemperature ?? "unknown"}</dd>
          </dl>
        </aside>

        <section className="panel editor">
          <h2>Streaming Prompt</h2>
          <label>
            Prompt
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={8} />
          </label>
          <div className="preset-row">
            {prompts.map((item) => (
              <button className="chip" key={item} onClick={() => setPrompt(item)}>
                {item.slice(0, 34)}
              </button>
            ))}
          </div>
          <button disabled={!model.session || stream.status === "streaming"} onClick={() => stream.streamPrompt(prompt)}>
            Stream Response
          </button>
          {model.error && <p role="alert">{model.error.message}</p>}
          {stream.error && <p role="alert">{stream.error.message}</p>}
        </section>

        <section className="panel output">
          <h2>Output</h2>
          <p className="muted">Status: {stream.status}</p>
          <output>{stream.text || "The local model response will appear here."}</output>
        </section>
      </section>
    </main>
  );
}

function StatusTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-tile">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
