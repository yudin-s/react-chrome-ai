import { useMemo, useState } from "react";
import { useChromeAIPrompt, useChromeAISummarizer } from "@yudin-s/react-chrome-ai";

type ReviewResult = {
  summary: string;
  risk: "low" | "medium" | "high";
  findings: Array<{ title: string; severity: "low" | "medium" | "high"; detail: string }>;
};

const sampleDiff = `diff --git a/src/auth.ts b/src/auth.ts
+export async function login(password: string) {
+  const token = localStorage.getItem("admin-token");
+  if (password.length > 4 && token) return { ok: true, token };
+  return { ok: false };
+}
`;

export function App() {
  const [diff, setDiff] = useState(sampleDiff);
  const review = useChromeAIPrompt<ReviewResult>({
    reflection: {
      format: "json",
      reflect: true,
      schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          risk: { enum: ["low", "medium", "high"] },
          findings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                severity: { enum: ["low", "medium", "high"] },
                detail: { type: "string" },
              },
              required: ["title", "severity", "detail"],
            },
          },
        },
        required: ["summary", "risk", "findings"],
      },
    },
  });
  const summarizer = useChromeAISummarizer({
    createOptions: {
      type: "key-points",
      format: "markdown",
      length: "short",
      expectedInputLanguages: ["en"],
      outputLanguage: "en",
    },
  });

  const prompt = useMemo(
    () =>
      `Review this code diff. Return JSON with summary, risk, and findings.\n\n${diff}`,
    [diff]
  );

  return (
    <main className="shell">
      <header>
        <p>React Chrome AI example</p>
        <h1>Local Review Workbench</h1>
      </header>

      <section className="layout">
        <section className="panel input-panel">
          <div className="panel-heading">
            <h2>Diff Input</h2>
            <button onClick={() => setDiff(sampleDiff)}>Reset sample</button>
          </div>
          <textarea value={diff} onChange={(event) => setDiff(event.target.value)} />
          <div className="actions">
            <button disabled={review.status === "prompting"} onClick={() => review.promptStructured(prompt)}>
              Structured Review
            </button>
            <button
              className="secondary"
              disabled={summarizer.status === "prompting"}
              onClick={() => summarizer.run(diff)}
            >
              Summarize Diff
            </button>
          </div>
          {(review.progress || summarizer.progress) && (
            <progress value={(review.progress ?? summarizer.progress)?.progress} max={1} />
          )}
        </section>

        <section className="panel result-panel">
          <h2>Structured Output</h2>
          <div className="risk-strip" data-risk={review.data?.risk ?? "none"}>
            <span>Risk</span>
            <strong>{review.data?.risk ?? "pending"}</strong>
          </div>
          <p>{review.data?.summary ?? "Run a structured review to get local JSON output."}</p>
          <div className="findings">
            {(review.data?.findings ?? []).map((finding) => (
              <article key={finding.title}>
                <span>{finding.severity}</span>
                <h3>{finding.title}</h3>
                <p>{finding.detail}</p>
              </article>
            ))}
          </div>
          {review.error && <p role="alert">{review.error.message}</p>}
        </section>

        <section className="panel summary-panel">
          <h2>Task API Summary</h2>
          <p className="muted">Status: {summarizer.status}</p>
          <output>{summarizer.text || "Summarizer output appears here."}</output>
          {summarizer.error && <p role="alert">{summarizer.error.message}</p>}
        </section>
      </section>
    </main>
  );
}
