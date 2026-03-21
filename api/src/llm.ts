/**
 * LLM abstraction layer.
 *
 * Selects the provider based on env vars:
 *   LLM_PROVIDER=anthropic  (default when ANTHROPIC_API_KEY is set)
 *   LLM_PROVIDER=openai     (uses OPENAI_API_KEY)
 *
 * Usage:
 *   import { llm } from './llm';
 *   const text = await llm.generate('Write a fun description for ...');
 */

export interface LLMOptions {
  /** Max tokens in the completion (default: 200) */
  maxTokens?: number;
  /** Temperature 0–1 (default: 0.7) */
  temperature?: number;
  /** System prompt (used only when provider supports it) */
  system?: string;
}

export interface LLMProvider {
  name: string;
  generate(prompt: string, opts?: LLMOptions): Promise<string>;
}

// ---------------------------------------------------------------------------
// Anthropic provider
// ---------------------------------------------------------------------------
function createAnthropicProvider(): LLMProvider {
  // Lazy import so the module isn't loaded when provider is openai
  const { default: Anthropic } = require('@anthropic-ai/sdk') as typeof import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  return {
    name: 'anthropic',
    async generate(prompt, opts = {}) {
      const { maxTokens = 200, temperature = 0.7, system } = opts;
      const msg = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages: [{ role: 'user', content: prompt }],
      } as any);
      return ((msg.content[0] as any).text as string).trim();
    },
  };
}

// ---------------------------------------------------------------------------
// OpenAI provider
// ---------------------------------------------------------------------------
function createOpenAIProvider(): LLMProvider {
  const { default: OpenAI } = require('openai') as typeof import('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  return {
    name: 'openai',
    async generate(prompt, opts = {}) {
      const { maxTokens = 200, temperature = 0.7, system } = opts;
      const messages: { role: 'system' | 'user'; content: string }[] = [];
      if (system) messages.push({ role: 'system', content: system });
      messages.push({ role: 'user', content: prompt });

      const resp = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        max_tokens: maxTokens,
        temperature,
        messages,
      });
      return (resp.choices[0].message.content ?? '').trim();
    },
  };
}

// ---------------------------------------------------------------------------
// Factory — picks provider at startup
// ---------------------------------------------------------------------------
function createLLMProvider(): LLMProvider {
  const explicit = (process.env.LLM_PROVIDER || '').toLowerCase();

  if (explicit === 'openai' || (!explicit && !process.env.ANTHROPIC_API_KEY && process.env.OPENAI_API_KEY)) {
    if (!process.env.OPENAI_API_KEY) throw new Error('LLM_PROVIDER=openai but OPENAI_API_KEY is not set');
    console.log('[llm] provider: openai');
    return createOpenAIProvider();
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[llm] No LLM API key found; AI features will be disabled');
    return {
      name: 'none',
      async generate() { throw new Error('No LLM provider configured'); },
    };
  }

  console.log('[llm] provider: anthropic');
  return createAnthropicProvider();
}

export const llm: LLMProvider = createLLMProvider();
