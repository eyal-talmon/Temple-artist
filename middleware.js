// Password gate (Vercel Routing Middleware). Runs before every request.
//
// The password lives in the Vercel project's Environment Variables as
// SITE_PASSWORD (never in this repo). While it's set, visitors without the
// unlock cookie get the landing page in /gate/ instead of the site; the
// form posts to /unlock, which sets the cookie for 30 days. Remove the
// variable (and redeploy) to open the site to everyone again.

export const config = {
  // everything except the gate's own files, fonts and favicons
  matcher: '/((?!gate/|fonts/|img/favicon|img/apple-touch-icon|_vercel).*)',
};

const COOKIE = 'temple_gate';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Same as next() / rewrite() from @vercel/functions, without the dependency
const next = () => new Response(null, { headers: { 'x-middleware-next': '1' } });
const rewrite = (url) => new Response(null, { headers: { 'x-middleware-rewrite': url.toString() } });

// the cookie holds a hash of the password, never the password itself
async function token(password) {
  const data = new TextEncoder().encode('temple-2027-gate:' + password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  const match = header.split(/;\s*/).find((c) => c.startsWith(name + '='));
  return match ? match.slice(name.length + 1) : null;
}

// only send people back to a page on this site
function safePath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

export default async function middleware(request) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return next(); // no password set: the site is open

  const url = new URL(request.url);
  const expected = await token(password);

  // the landing page's form
  if (url.pathname === '/unlock' && request.method === 'POST') {
    const form = await request.formData();
    const back = safePath(form.get('next'));
    if (form.get('password') === password) {
      return new Response(null, {
        status: 303,
        headers: {
          Location: back,
          'Set-Cookie': `${COOKIE}=${expected}; Path=/; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Lax`,
          'Cache-Control': 'no-store',
        },
      });
    }
    const retry = new URL(back, url.origin);
    retry.searchParams.set('gate', 'wrong');
    return new Response(null, {
      status: 303,
      headers: { Location: retry.pathname + retry.search, 'Cache-Control': 'no-store' },
    });
  }

  if (readCookie(request, COOKIE) === expected) return next();

  // locked: show the landing page at whatever address was asked for
  return rewrite(new URL('/gate/', url.origin));
}
