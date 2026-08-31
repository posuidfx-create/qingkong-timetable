# analyze-learning-record

Authenticated Supabase Edge Function for user-triggered analysis of private learning-record images and PDFs.

Required Edge Function secret:

```text
GEMINI_API_KEY
```

Optional secret:

```text
GEMINI_MODEL=gemini-3.5-flash
```

Keep JWT verification enabled (the Supabase default). The browser invokes the function with only `{ "recordId": "..." }`; user ownership, Storage paths, and AI result fields are resolved and written on the server. Never expose the Gemini key as a `VITE_` variable.

Attachments up to 10 MiB are sent inline. Larger supported images and PDFs use the Gemini Files API so base64 expansion cannot push the interaction request past the multimodal payload budget. Files API objects are deleted in a `finally` cleanup after either success or failure; Gemini's automatic expiration remains the fallback if that cleanup request fails.
