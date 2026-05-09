// src/pages/api/klaviyo/subscribe.ts
// Suscribe email a una lista Klaviyo y dispara flow Added-to-List asociado.
// Reemplaza los signup forms onsite de Klaviyo: ahora la captura ocurre
// desde un PromoPopup propio, este endpoint mete el email en la lista.

import type { APIRoute } from 'astro';

const DEFAULT_LIST_ID = 'QS8c8H'; // Newsletter Imprime Arte (dispara flow "Bienvenida Imprime Arte")
const KLAVIYO_REVISION = '2024-10-15';

export const POST: APIRoute = async ({ request }) => {
  try {
    const apiKey = import.meta.env.KLAVIYO_API_KEY;
    if (!apiKey) {
      return json({ error: 'Klaviyo API key no configurada' }, 500);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.email !== 'string') {
      return json({ error: 'email requerido' }, 400);
    }

    const email = body.email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      return json({ error: 'email inválido' }, 400);
    }

    const listId = typeof body.listId === 'string' && body.listId.length > 0 ? body.listId : DEFAULT_LIST_ID;

    const klaviyoResp = await fetch(
      'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs/',
      {
        method: 'POST',
        headers: {
          Authorization: `Klaviyo-API-Key ${apiKey}`,
          revision: KLAVIYO_REVISION,
          'Content-Type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          data: {
            type: 'profile-subscription-bulk-create-job',
            attributes: {
              custom_source: 'PromoPopup ImprimeArte',
              profiles: {
                data: [
                  {
                    type: 'profile',
                    attributes: {
                      email,
                      subscriptions: {
                        email: {
                          marketing: { consent: 'SUBSCRIBED' },
                        },
                      },
                    },
                  },
                ],
              },
            },
            relationships: {
              list: { data: { type: 'list', id: listId } },
            },
          },
        }),
      }
    );

    if (!klaviyoResp.ok && klaviyoResp.status !== 202) {
      const errText = await klaviyoResp.text();
      return json({ error: 'Klaviyo rechazó la suscripción', detail: errText }, 502);
    }

    return json({ ok: true, email, listId }, 200);
  } catch (err) {
    return json({ error: 'Error interno', detail: String(err) }, 500);
  }
};

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}
