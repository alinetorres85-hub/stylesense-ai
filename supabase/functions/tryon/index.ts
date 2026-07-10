// Função de backend (Supabase Edge Function) — "provador com IA".
// Recebe a foto do usuário (human) + a foto da peça (garment) e chama o modelo
// de virtual try-on da fal.ai (Kling Kolors). A chave secreta FAL_KEY fica só
// aqui no servidor (nunca no app).
//
// Deploy: no painel do Supabase → Edge Functions → Deploy a new function →
// nome "tryon" → cole este arquivo → Deploy. Depois adicione o segredo FAL_KEY.

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { human, garment } = await req.json();
    if (!human || !garment) {
      return json({ error: 'Faltou a sua foto ou a foto da peça.' }, 400);
    }

    const falKey = Deno.env.get('FAL_KEY');
    if (!falKey) return json({ error: 'FAL_KEY não configurada no servidor.' }, 500);

    const resp = await fetch(
      'https://fal.run/fal-ai/kling/v1-5/kolors-virtual-try-on',
      {
        method: 'POST',
        headers: {
          Authorization: `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          human_image_url: human,
          garment_image_url: garment,
        }),
      },
    );

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const detail =
        (data && (data.detail || data.error || data.message)) || `Erro ${resp.status}`;
      return json({ error: typeof detail === 'string' ? detail : 'Falha na IA' }, 502);
    }

    const url = data?.image?.url ?? null;
    if (!url) return json({ error: 'A IA não retornou imagem.' }, 502);
    return json({ url });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
