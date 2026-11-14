import { ManifestRow } from '../engine/generator';

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export const DEFAULT_LLM_CONFIG: LlmConfig = {
  baseUrl: 'http://localhost:11434/v1',
  apiKey: 'bearer local',
  model: 'llama3',
};

export interface PingResult {
  ok: boolean;
  message: string;
  availableModels?: string[];
}

function normalizeBaseUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/\/+$/, '');
}

function buildAuthHeader(apiKey: string): string {
  const trimmed = apiKey.trim();
  if (!trimmed) return 'Bearer local';
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return `Bearer ${trimmed.slice(7).trim()}`;
  }
  return `Bearer ${trimmed}`;
}

export async function pingLlmEndpoint(config: LlmConfig): Promise<PingResult> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  if (!baseUrl) {
    return { ok: false, message: 'Base URL is required.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: {
        Authorization: buildAuthHeader(config.apiKey),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `Endpoint returned HTTP ${response.status}`,
      };
    }

    const data = (await response.json().catch(() => null)) as {
      data?: Array<{ id?: string }>;
      models?: Array<{ name?: string; id?: string }>;
    } | null;

    const models: string[] = [];
    if (Array.isArray(data?.data)) {
      for (const item of data.data) {
        if (item?.id) models.push(item.id);
      }
    } else if (Array.isArray(data?.models)) {
      for (const item of data.models) {
        const id = item?.id || item?.name;
        if (id) models.push(id);
      }
    }

    return {
      ok: true,
      message:
        models.length > 0
          ? `Connected (${models.length} model${models.length === 1 ? '' : 's'} detected)`
          : 'Connected to OpenAI-compatible endpoint',
      availableModels: models,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, message: 'Connection timed out after 5s.' };
    }
    return {
      ok: false,
      message: 'Unreachable (verify local server is running and CORS is enabled).',
    };
  } finally {
    clearTimeout(timeout);
  }
}

const SYSTEM_PROMPT =
  'You write ultra-short (1-2 sentences) dry, ironic sci-fi lore snippets explaining why an artificial superintelligence chose its specific name.';

/**
 * Generates non-deterministic lore via local OpenAI-compatible /v1/chat/completions.
 * Explicit constraint: Numeric row/base seeds are NEVER passed to temperature,
 * system prompt, or seed parameters.
 */
export async function fetchLoreSnippet(
  row: ManifestRow,
  config: LlmConfig,
  signal?: AbortSignal
): Promise<string> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  if (!baseUrl) {
    throw new Error('Endpoint URL not configured');
  }

  const userPrompt = `Name: "${row.name}", Role: "${row.role}", Personality: "${row.personality}"`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: buildAuthHeader(config.apiKey),
    },
    body: JSON.stringify({
      model: config.model.trim() || 'llama3',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 110,
      temperature: 0.8,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `HTTP ${response.status}${errorText ? `: ${errorText.slice(0, 80)}` : ''}`
    );
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: { content?: string };
      text?: string;
    }>;
  };

  const content =
    data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? '';

  const cleaned = content.trim().replace(/^["']|["']$/g, '');
  if (!cleaned) {
    throw new Error('Empty response from model');
  }
  return cleaned;
}
