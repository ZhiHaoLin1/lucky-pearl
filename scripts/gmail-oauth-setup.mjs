// One-time script to obtain a Gmail refresh token for the mailbox that
// receives Venmo/Zelle payment notifications. Run locally:
//
//   GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... node scripts/gmail-oauth-setup.mjs
//
// (On Windows Command Prompt, use `set VAR=value` on its own line instead —
// see the setup guide.)
//
// It starts a tiny local server, prints a Google consent URL, and waits for
// you to open it in your own browser and approve access with the Gmail
// account that receives the notifications. It never sees your Google
// password — only the one-time authorization code Google redirects back
// with. Prints the refresh token to store as GMAIL_REFRESH_TOKEN once done.

import http from 'node:http';

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET first.');
  process.exitCode = 1;
} else {
  run();
}

function run() {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly');
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');

  console.log('\nOpen this URL in your own browser and sign in with the Gmail account\nthat receives the Venmo/Zelle notifications, then approve access:\n');
  console.log(authUrl.toString());
  console.log('\nWaiting for you to finish...\n');

  // Node can truncate buffered stdout if process.exit() is called right
  // after console.log — especially on Windows. Every exit path below sets
  // process.exitCode and lets the process end naturally once the server
  // closes and the event loop drains, instead of forcing an immediate exit.
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, REDIRECT_URI);
    if (url.pathname !== '/oauth2callback') {
      res.writeHead(404).end();
      return;
    }

    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');
    if (error || !code) {
      res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Authorization failed - check the terminal.');
      console.error('Authorization failed:', error || 'no code returned');
      process.exitCode = 1;
      server.close();
      return;
    }

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });
      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok || !tokenData.refresh_token) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Token exchange failed - check the terminal.');
        console.error('Token exchange failed:', JSON.stringify(tokenData, null, 2));
        if (!tokenData.refresh_token) {
          console.error(
            "\nNo refresh_token in the response - if you've authorized this app before, revoke access at " +
              'https://myaccount.google.com/permissions and run this script again (Google only issues a ' +
              'refresh token on the first consent, or when prompt=consent forces re-approval).'
          );
        }
        process.exitCode = 1;
        server.close();
        return;
      }

      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Success - you can close this tab and return to the terminal.');
      console.log('==================================================');
      console.log('Success. Your refresh token is:');
      console.log('');
      console.log(tokenData.refresh_token);
      console.log('');
      console.log('Send this to Claude to store as GMAIL_REFRESH_TOKEN - treat it like a password.');
      console.log('==================================================');
      server.close();
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Unexpected error - check the terminal.');
      console.error(err);
      process.exitCode = 1;
      server.close();
    }
  });

  server.listen(PORT);
}
