import { useChromeAISession } from "@yudin-s/react-chrome-ai";

export function ModelDownloadProgressExample() {
  const model = useChromeAISession({ autoCreate: false });

  return (
    <section>
      <button onClick={() => model.createSession()}>
        Prepare Chrome AI model
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
