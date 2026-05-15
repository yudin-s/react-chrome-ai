# Recipe: Structured Output

Use `promptStructured()` when the app expects JSON. The helper can add JSON instructions, pass `responseConstraint`, and optionally run a reflection pass.

```tsx
import { useChromeAIPrompt } from "@yudin-s/react-chrome-ai";

type Result = {
  label: string;
  confidence: number;
};

export function Classifier() {
  const ai = useChromeAIPrompt<Result>({
    reflection: {
      format: "json",
      reflect: true,
      schema: {
        type: "object",
        properties: {
          label: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["label", "confidence"],
      },
    },
  });

  async function classify() {
    const result = await ai.promptStructured("Classify: user asks for offline translation.");
    console.log(result.data);
  }

  return <button onClick={classify}>Classify</button>;
}
```

Always validate structured model output before using it for critical state changes.
