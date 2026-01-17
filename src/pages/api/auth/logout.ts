import type { APIRoute } from 'astro';

const AUTH_COOKIE_NAME = 'auth_token';

export const POST: APIRoute = async () => {
  const secureFlag = import.meta.env.PROD ? '; Secure' : '';
  const cookie = `${AUTH_COOKIE_NAME}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secureFlag}`;

  const response = new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  response.headers.append('Set-Cookie', cookie);
  return response;
};
