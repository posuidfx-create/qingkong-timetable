# analyze-vocabulary-word

Private, authenticated DeepSeek analysis for one saved vocabulary word.

- Reads `DEEPSEEK_API_KEY` and optional `DEEPSEEK_MODEL` only in the Edge Function runtime.
- Verifies the Supabase JWT and exact `vocabulary_words.user_id` ownership.
- Reuses a completed `analysis_json` unless the user explicitly requests a rerun.
- Writes only `analysis_status` and `analysis_json` through the service role.
