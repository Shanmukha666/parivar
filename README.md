# i18n starter pack (English, Hindi, Tamil, Telugu)

- `content/languages.json`: language registry (speech codes, fonts, tier)
- `apps/web/src/locales/*.json`: runtime UI strings
- `content/locales/*.json`: translation/content reference pack
- `content/glossary.json`: trade and scheme terms per language
- `content/prompt_language_block.md`: language section for the system prompt
- `tools/normalize_digits.py`: digit normalisation utility for the number validator

All translations are DRAFTS. Get each reviewed by a native speaker and adjust to
how families in your target districts actually speak.

Fonts: load Noto Sans Devanagari / Tamil / Telugu only for the selected language.
