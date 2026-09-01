# analyze-learning-record

Server-only DeepSeek analysis for the signed-in user's private learning record text.

Required Edge Function secret:

```text
DEEPSEEK_API_KEY
```

Optional server-side model override:

```text
DEEPSEEK_MODEL=deepseek-v4-flash
```

Keep JWT verification enabled. The browser sends only `{ "recordId": "..." }`; the function verifies the bearer user and record ownership before calling DeepSeek's official OpenAI-compatible Chat Completions API. Never expose the DeepSeek key as a `VITE_` variable.

This provider currently analyzes record text only. Attachments remain private, unchanged, and reported as unsupported; image, PDF, Office, and audio processing are intentionally not sent to the text model.
