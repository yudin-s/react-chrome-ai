# Recipe: Local Chat Or Assistant

Use `useChromeAIPrompt` for short request/response interactions.

```tsx
import { useChromeAIPrompt } from "@yudin-s/react-chrome-ai";

export function LocalAssistant() {
  const ai = useChromeAIPrompt({
    createOptions: {
      initialPrompts: [
        { role: "system", content: "You are concise and practical." },
      ],
    },
  });

  return (
    <section>
      <button
        disabled={ai.status === "prompting"}
        onClick={() => ai.prompt("Explain Chrome Built-in AI in one paragraph.")}
      >
        Ask
      </button>
      <output>{ai.text}</output>
    </section>
  );
}
```

For long responses, create a session with `useChromeAISession` and stream with `useChromeAIStream`.
