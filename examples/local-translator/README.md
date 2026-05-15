# Local Translator (Vite + React)

Self-contained example showing:

- `useChromeAITranslator`
- `useChromeAILanguageDetector`
- support/availability/status/progress/error diagnostics for both APIs
- source/target language controls
- textarea input
- Detect + Translate actions
- output panel

## Run

```bash
cd examples/local-translator
npm install
npm run dev
```

## Notes

This example targets Chrome Built-in AI APIs (if available in your browser).  
If translator/detector are unavailable, the cards show availability and status states directly from hooks.
