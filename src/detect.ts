// Detecção de categoria e cor da peça por visão (Claude API).
//
// Envia a foto (base64) para a API Messages da Anthropic e pede de volta a
// categoria + cor mais próximas das opções do app. A chave de API é do próprio
// usuário, fica salva só no aparelho e nunca sai para outro lugar além da
// Anthropic.

import { CATEGORY_LABELS, COLORS, Category } from './types';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5';

const CATEGORY_IDS: Category[] = ['top', 'bottom', 'dress', 'outerwear', 'shoes', 'accessory'];
const COLOR_IDS = COLORS.map((c) => c.id);

export interface Detection {
  category?: Category;
  colorId?: string;
  raw: string;
}

function buildPrompt(): string {
  const cats = CATEGORY_IDS.map((c) => `${c} (${CATEGORY_LABELS[c]})`).join(', ');
  const cols = COLORS.map((c) => `${c.id} (${c.label})`).join(', ');
  return (
    'Você é um assistente que cataloga roupas. Olhe a imagem da peça de roupa e ' +
    'responda APENAS com um objeto JSON compacto, sem texto antes ou depois, no formato ' +
    '{"category": "<id>", "colorId": "<id>"}.\n' +
    `category deve ser um de: ${cats}.\n` +
    `colorId deve ser a cor predominante, um de: ${cols}.\n` +
    'Se for estampado/multicolor, use "estampado". Não explique nada.'
  );
}

export async function detectGarment(
  base64: string,
  mediaType: string,
  apiKey: string,
): Promise<Detection> {
  const body = {
    model: MODEL,
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: buildPrompt() },
        ],
      },
    ],
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const err = await res.json();
      detail = err?.error?.message ?? '';
    } catch {
      // ignora
    }
    if (res.status === 401) throw new Error('Chave de API inválida. Verifique e tente de novo.');
    throw new Error(`Erro ${res.status} na detecção. ${detail}`.trim());
  }

  const data = await res.json();
  const textBlock = (data.content ?? []).find((b: any) => b.type === 'text');
  const text: string = textBlock?.text ?? '';

  let parsed: any = {};
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      // ignora — devolve raw
    }
  }

  const category = CATEGORY_IDS.includes(parsed.category) ? (parsed.category as Category) : undefined;
  const colorId = COLOR_IDS.includes(parsed.colorId) ? (parsed.colorId as string) : undefined;

  return { category, colorId, raw: text };
}
