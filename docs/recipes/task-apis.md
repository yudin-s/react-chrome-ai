# Recipe: Task APIs

Chrome Built-in AI includes task APIs such as Summarizer, Translator, LanguageDetector, Writer, Rewriter, and Proofreader.

```tsx
import {
  useChromeAISummarizer,
  useChromeAITranslator,
} from "@yudin-s/react-chrome-ai";

export function TaskExamples({ article }: { article: string }) {
  const summarizer = useChromeAISummarizer({
    createOptions: {
      type: "key-points",
      format: "markdown",
      length: "medium",
      expectedInputLanguages: ["en"],
      outputLanguage: "en",
    },
  });

  const translator = useChromeAITranslator({
    createOptions: {
      sourceLanguage: "en",
      targetLanguage: "es",
    },
  });

  return (
    <section>
      <button onClick={() => summarizer.run(article)}>Summarize</button>
      <button onClick={() => translator.run(summarizer.text)}>Translate summary</button>
      <output>{translator.text || summarizer.text}</output>
    </section>
  );
}
```

For new or experimental task methods, use `useChromeAITaskOperation` directly.
