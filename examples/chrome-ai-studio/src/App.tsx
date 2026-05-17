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

const quickStart = `import { useChromeAIPrompt } from "@yudin-s/react-chrome-ai";

export function LocalAssistant() {
  const ai = useChromeAIPrompt();

  return (
    <button onClick={() => ai.prompt("Summarize this locally.")}>
      Ask Gemini Nano
    </button>
  );
}`;

const features = [
  {
    title: "Model readiness",
    text: "Detect support, availability, user activation, and browser-managed model preparation.",
  },
  {
    title: "Download progress",
    text: "Render progress from Chrome AI create({ monitor }) as ordinary React state.",
  },
  {
    title: "Prompt streaming",
    text: "Use prompt() and promptStreaming() with lifecycle, errors, aborts, and teardown.",
  },
  {
    title: "Task APIs",
    text: "Wrap Summarizer, Translator, Language Detector, Writer, Rewriter, and Proofreader.",
  },
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
      <nav className="site-nav" aria-label="Package navigation">
        <a className="brand" href="https://github.com/yudin-s/react-chrome-ai">
          @yudin-s/react-chrome-ai
        </a>
        <div className="package-links">
          <a href="https://www.npmjs.com/package/@yudin-s/react-chrome-ai">npm</a>
          <a href="https://github.com/yudin-s/react-chrome-ai">GitHub</a>
          <a href="https://github.com/yudin-s/react-chrome-ai/blob/main/docs/hooks.md">Docs</a>
          <a href="https://github.com/yudin-s/react-chrome-ai/tree/main/docs/recipes">Recipes</a>
        </div>
      </nav>

      <header className="hero">
        <div>
          <p className="eyebrow">React hooks library for Chrome-side LLMs</p>
          <h1>@yudin-s/react-chrome-ai</h1>
          <p className="tagline">
            React hooks for Gemini Nano, Chrome Built-in AI, LanguageModel Prompt API, and browser-side LLMs.
          </p>
          <div className="hero-actions">
            <a className="primary-link" href="https://www.npmjs.com/package/@yudin-s/react-chrome-ai">
              View on npm
            </a>
            <a href="https://github.com/yudin-s/react-chrome-ai">Read the source</a>
            <a href="#playground">Try the live playground</a>
          </div>
        </div>

        <section className="install-card" aria-labelledby="install-title">
          <h2 id="install-title">Install</h2>
          <code className="install-command">npm install @yudin-s/react-chrome-ai</code>
          <p>
            No API key, backend, or bundled model. Chrome owns model availability
            and Gemini Nano downloads.
          </p>
        </section>
      </header>

      <section className="quickstart" aria-labelledby="quickstart-title">
        <div>
          <p className="eyebrow">Quick start</p>
          <h2 id="quickstart-title">Use Chrome AI from React state</h2>
          <p>
            Hooks expose availability, download progress, sessions, prompts,
            streaming, structured output, and task APIs without hiding the native
            Chrome Built-in AI behavior.
          </p>
        </div>
        <pre><code>{quickStart}</code></pre>
      </section>

      <section className="feature-grid" aria-label="Feature coverage">
        {features.map((feature) => (
          <article className="feature-tile" key={feature.title}>
            <h2>{feature.title}</h2>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <Playground
        contextPercent={contextPercent}
        model={model}
        params={params}
        prompt={prompt}
        readiness={readiness}
        setPrompt={setPrompt}
        stream={stream}
        context={context}
      />
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

type PlaygroundProps = {
  context: ReturnType<typeof useChromeAIContext>;
  contextPercent: number;
  model: ReturnType<typeof useChromeAISession>;
  params: ReturnType<typeof useChromeAIParams>;
  prompt: string;
  readiness: ReturnType<typeof useChromeAIAvailability>;
  setPrompt: (prompt: string) => void;
  stream: ReturnType<typeof useChromeAIStream>;
};

function Playground({
  context,
  contextPercent,
  model,
  params,
  prompt,
  readiness,
  setPrompt,
  stream,
}: PlaygroundProps) {
  return (
    <section className="playground-block" id="playground">
      <section className="section-heading">
        <p className="eyebrow">Live example</p>
        <h2>Chrome AI playground</h2>
        <p>
          This playground is built with the package hooks and shows the UI states a
          real app needs to control.
        </p>
      </section>

      <section className="status-grid" aria-label="Chrome AI runtime status">
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
    </section>
  );
}
