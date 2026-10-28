import { OAUTH_COOKIE, appOrigin, cookie, randomId, sign } from '../_lib/session.js'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = appOrigin()
  // Always sign in on the canonical domain, so the redirect URI and cookies match.
  if (url.origin !== origin) return Response.redirect(`${origin}/api/auth/login${url.search}`, 302)
  const rt = url.searchParams.get('returnTo') || '/'
  const returnTo = rt.startsWith('/') && !rt.startsWith('//') ? rt : '/'
  const state = randomId(), nonce = randomId()
  const auth = new URL(`https://login.microsoftonline.com/${process.env.MS_TENANT_ID}/oauth2/v2.0/authorize`)
  auth.search = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID || '', response_type: 'code', response_mode: 'query',
    redirect_uri: `${origin}/api/auth/callback`, scope: 'openid profile email',
    state, nonce, prompt: 'select_account',
  }).toString()
  return new Response(null, { status: 302, headers: { Location: auth.toString(), 'Set-Cookie': cookie(OAUTH_COOKIE, sign({ s: state, n: nonce, r: returnTo, x: Date.now() + 10 * 60_000 }), 600), 'Cache-Control': 'no-store' } })
}
