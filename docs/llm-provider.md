# Cherry Chores — LLM Provider Configuration

**Last updated:** 2026-03-21

---

## Overview

All AI features in Cherry Chores are routed through a single abstraction layer at `api/src/llm.ts`. This allows switching between Anthropic and OpenAI without touching feature code.

---

## Configuration

Set the following in your `.env` file:

```env
# Provider: "anthropic" or "openai"
# Auto-selects: anthropic if ANTHROPIC_API_KEY is set; openai if only OPENAI_API_KEY is set
LLM_PROVIDER=openai

# API keys (set whichever provider(s) you want to use)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...

# Optional: override the default model per provider
# ANTHROPIC_MODEL=claude-haiku-4-5-20251001   (default)
# OPENAI_MODEL=gpt-4o-mini                    (default)
```

### Auto-selection logic

1. If `LLM_PROVIDER` is explicitly set → use that provider
2. Else if only `OPENAI_API_KEY` is set → use OpenAI
3. Else if `ANTHROPIC_API_KEY` is set → use Anthropic
4. If no key is set → AI features disabled (catalog preview falls back to raw scraped text)

---

## Usage in Code

```typescript
import { llm } from '../llm';

const description = await llm.generate(
  'Generate a kid-friendly description for: ...',
  { maxTokens: 80, temperature: 0.7 }
);
```

### `LLMOptions`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxTokens` | number | 200 | Max completion tokens |
| `temperature` | number | 0.7 | Sampling temperature (0–1) |
| `system` | string | — | System prompt (prepended as system message) |

---

## Provider Details

### Anthropic

- SDK: `@anthropic-ai/sdk`
- Default model: `claude-haiku-4-5-20251001`
- Override: `ANTHROPIC_MODEL` env var

### OpenAI

- SDK: `openai`
- Default model: `gpt-4o-mini`
- Override: `OPENAI_MODEL` env var

---

## Current Usage

| Feature | Prompt | `maxTokens` |
|---------|--------|-------------|
| Catalog item description (URL preview) | Kid-friendly product description from OG title + description | 80 |

---

## Adding New AI Features

Import `llm` and call `llm.generate()`. Provider switching is handled automatically — no feature code changes needed when the admin changes `LLM_PROVIDER`.

```typescript
import { llm } from '../llm';

// Example: generate a motivational message for a child
const msg = await llm.generate(
  `Write a short, encouraging message for a 10-year-old who just completed their chore: "${choreName}". Max 20 words.`,
  { maxTokens: 40 }
);
```
