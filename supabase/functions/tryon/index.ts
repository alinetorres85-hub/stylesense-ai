// Função de backend (Supabase Edge Function) — "provador com IA".
// Proxy genérico e seguro para a fal.ai: recebe { model, input } do app e chama
// o modelo escolhido (whitelist), devolvendo a URL da imagem gerada. A chave
// secreta FAL_KEY fica só aqui no servidor (nunca no app).
//
// Retrocompatível: aceita também o formato antigo { human, garment } (Kolors).
//
// Deploy: painel do Supabase → Edge Functions → função "tryon" → cole este
// arquivo → Deploy. O segredo FAL_KEY já está configurado.

const cors: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

// Só estes modelos podem ser chamados (evita abuso do crédito).
const ALLOWED = new Set([
  'fal-ai/fashn/tryon/v1.6',
  'fal-ai/kling/v1-5/kolors-virtual-try-on',
]);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json();

    let model: string;
    let input: Record<string, unknown>;
    if (body.model && body.input) {
      model = body.model;
      input = body.input;
    } else if (body.human && body.garment) {
      // formato antigo
      model = 'fal-ai/kling/v1-5/kolors-virtual-try-on';
      input = { human_image_url: body.human, garment_image_url: body.garment };
    } else {
      return json({ error: 'Entrada inválida (faltou model/input).' }, 400);
    }

    if (!ALLOWED.has(model)) return json({ error: 'Modelo não permitido.' }, 400);

    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) return json({ error: 'FAL_KEY não configurada no servidor.' }, 500);

    const resp = await fetch(`https://fal.run/${model}`, {
      method: 'POST',
      headers: { Authorization: `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    const data = await resp.json().catch(() => ({} as any));
    if (!resp.ok) {
      const detail =
        (data && (data.detail || data.error || data.message)) || `Erro ${resp.status}`;
      return json({ error: typeof detail === 'string' ? detail : 'Falha na IA' }, 502);
    }

    // FASHN devolve images[0].url; Kolors devolve image.url.
    const url = data?.images?.[0]?.url ?? data?.image?.url ?? null;
    if (!url) return json({ error: 'A IA não retornou imagem.' }, 502);
    return json({ url });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
