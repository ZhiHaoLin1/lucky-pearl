// One-time script to obtain a Gmail refresh token for the mailbox that
// receives Venmo/Zelle payment notifications. Run locally:
//
//   GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... node scripts/gmail-oauth-setup.mjs
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
  process.exit(1);
}

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

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== '/oauth2callback') {
    res.writeHead(404).end();
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (error || !code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' }).end('Authorization failed — check the terminal.');
    console.error('Authorization failed:', error || 'no code returned');
    server.close();
    process.exit(1);
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
      res.writeHead(500, { 'Content-Type': 'text/plain' }).end('Token exchange failed — check the terminal.');
      console.error('Token exchange failed:', JSON.stringify(tokenData, null, 2));
      if (!tokenData.refresh_token) {
        console.error(
          '\nNo refresh_token in the response — if you\'ve authorized this app before, revoke access at ' +
            'https://myaccount.google.com/permissions and run this script again (Google only issues a ' +
            'refresh token on the first consent, or when prompt=consent forces re-approval).'
        );
      }
      server.close();
      process.exit(1);
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' }).end('Success — you can close this tab and return to the terminal.');
    console.log('Success. Your refresh token is:\n');
    console.log(tokenData.refresh_token);
    console.log('\nSend this to Claude to store as GMAIL_REFRESH_TOKEN — treat it like a password.');
    server.close();
    process.exit(0);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' }).end('Unexpected error — check the terminal.');
    console.error(err);
    server.close();
    process.exit(1);
  }
});

server.listen(PORT);
