import { useChromeAIPrompt } from "@yudin-s/react-chrome-ai";

export function BasicPromptExample() {
  const ai = useChromeAIPrompt();

  return (
    <section>
      <button
        disabled={ai.status === "prompting"}
        onClick={() => ai.prompt("Summarize Chrome Built-in AI in one paragraph.")}
      >
        Ask local model
      </button>
      {ai.error && <p role="alert">{ai.error.message}</p>}
      <output>{ai.text}</output>
    </section>
  );
}
