import { SESSION_COOKIE, cookie, htmlPage } from '../_lib/session.js'

export async function GET() {
  return htmlPage('Kijelentkezve', '<h1>Kijelentkeztél</h1><p>A Fonte Viva Beszerzési Központ munkamenete lezárult.</p><a class="b" href="/api/auth/login">Bejelentkezés</a>', 200, { 'Set-Cookie': cookie(SESSION_COOKIE, '', 0) })
}
