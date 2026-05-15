import { FormEvent, useMemo, useState } from "react";
import {
  useChromeAITranslator,
  useChromeAILanguageDetector,
} from "@yudin-s/react-chrome-ai";

type AsyncState = "idle" | "checking" | "unsupported" | "unavailable" | "downloadable" | "downloading" | "preparing" | "ready" | "prompting" | "streaming" | "aborted" | "error";

function normalizeLanguage(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const candidate = normalizeLanguage(item);
      if (candidate) {
        return candidate;
      }
    }
    return null;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["language", "detectedLanguage", "lang", "locale"]) {
      const candidate = normalizeLanguage(record[key]);
      if (candidate) {
        return candidate;
      }
    }
  }

  return null;
}

function statusToPercent(state: number | undefined, progress?: { progress?: number }) {
  if (state != null) {
    return Math.min(100, Math.max(0, Math.round(state * 100)));
  }

  if (progress?.progress == null) {
    return null;
  }

  return Math.min(100, Math.max(0, Math.round(progress.progress * 100)));
}

function ApiDiagnostic({
  title,
  supported,
  availability,
  status,
  progress,
  error,
}: {
  title: string;
  supported: boolean;
  availability?: string;
  status: AsyncState;
  progress?: { progress?: number; indeterminate?: boolean; completed?: boolean };
  error?: Error;
}) {
  const percent = statusToPercent(progress?.progress, progress);
  const progressText = percent == null ? "in progress" : `${percent}%`;

  return (
    <section className="api-card">
      <h2>{title}</h2>
      <div className="kv-grid">
        <div>
          <strong>Support</strong>
          <p>{supported ? "Yes" : "No"}</p>
        </div>
        <div>
          <strong>Availability</strong>
          <p>{availability ?? "unknown"}</p>
        </div>
        <div>
          <strong>Status</strong>
          <p>{status}</p>
        </div>
      </div>
      {(status === "downloading" || status === "preparing") && (
        <div className="progress-row">
          <progress max={100} value={percent ?? undefined} />
          <span>{progressText}</span>
        </div>
      )}
      {error && <p className="error">Error: {error.message}</p>}
    </section>
  );
}

export function App() {
  const [sourceText, setSourceText] = useState("Hello. This is a local translator demo.");
  const [sourceLanguage, setSourceLanguage] = useState("en");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [detectedLanguage, setDetectedLanguage] = useState("");

  const translator = useChromeAITranslator({
    createOptions: {
      sourceLanguage: sourceLanguage || "en",
      targetLanguage: targetLanguage || "en",
    },
  });

  const detector = useChromeAILanguageDetector();
  const isBusy = translator.status === "prompting" || translator.status === "streaming";
  const isDetecting = detector.status === "prompting" || detector.status === "streaming";
  const translatedValue = useMemo(() => translator.text.trim(), [translator.text]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void onTranslate();
  };

  const onDetect = async () => {
    if (!sourceText.trim()) {
      return;
    }
    const detected = await detector.run(sourceText);
    const next = normalizeLanguage(detected);
    if (next) {
      setDetectedLanguage(next);
      setSourceLanguage(next);
      return;
    }
    setDetectedLanguage("Not detected");
  };

  const onTranslate = async () => {
    if (!sourceText.trim()) {
      return;
    }
    await translator.run(sourceText);
  };

  return (
    <main className="page">
      <header className="hero">
        <h1>Local Translator Demo</h1>
        <p>Chrome AI Translator + LanguageDetector, working in-browser.</p>
      </header>

      <div className="grid">
        <ApiDiagnostic
          title="Translator API"
          supported={translator.supported}
          availability={translator.availability}
          status={translator.status}
          progress={translator.progress}
          error={translator.error}
        />
        <ApiDiagnostic
          title="LanguageDetector API"
          supported={detector.supported}
          availability={detector.availability}
          status={detector.status}
          progress={detector.progress}
          error={detector.error}
        />
      </div>

      <section className="card">
        <form className="form" onSubmit={onSubmit}>
          <label className="inline-field">
            <span>Source language</span>
            <input
              value={sourceLanguage}
              onChange={(event) => setSourceLanguage(event.target.value)}
              placeholder="en"
              aria-label="Source language"
            />
          </label>
          <label className="inline-field">
            <span>Target language</span>
            <input
              value={targetLanguage}
              onChange={(event) => setTargetLanguage(event.target.value)}
              placeholder="es"
              aria-label="Target language"
            />
          </label>
          <label className="input-block">
            <span>Source text</span>
            <textarea
              value={sourceText}
              onChange={(event) => setSourceText(event.target.value)}
              placeholder="Введите текст для перевода"
              aria-label="Source text"
            />
          </label>
          <div className="actions">
            <button type="button" onClick={onDetect} disabled={isDetecting || isBusy}>
              Detect language
            </button>
            <button type="submit" disabled={isBusy || isDetecting}>
              Translate
            </button>
          </div>
        </form>

        <div className="kv">
          <span>Detected language:</span>
          <strong>{detectedLanguage || "—"}</strong>
        </div>
        <div className="kv">
          <span>Output language:</span>
          <strong>{targetLanguage || "—"}</strong>
        </div>
      </section>

      <section className="card">
        <h2>Output</h2>
        <output className="output">
          {translator.status === "prompting" || translator.status === "streaming"
            ? "Translating..."
            : translatedValue || "No output yet"}
        </output>
      </section>

      {translator.error && (
        <p role="alert" className="error">
          Translate error: {translator.error.message}
        </p>
      )}
      {detector.error && (
        <p role="alert" className="error">
          Detect error: {detector.error.message}
        </p>
      )}
    </main>
  );
}
