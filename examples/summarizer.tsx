import { useChromeAISummarizer } from "@yudin-s/react-chrome-ai";

export function SummarizerExample({ text }: { text: string }) {
  const summarizer = useChromeAISummarizer({
    createOptions: {
      type: "key-points",
      format: "markdown",
      length: "medium",
      expectedInputLanguages: ["en"],
      outputLanguage: "en",
    },
  });

  return (
    <section>
      <button
        disabled={summarizer.status === "prompting"}
        onClick={() => summarizer.run(text)}
      >
        Summarize locally
      </button>
      {summarizer.progress?.progress != null && (
        <progress value={summarizer.progress.progress} max={1} />
      )}
      <output>{summarizer.text}</output>
    </section>
  );
}
