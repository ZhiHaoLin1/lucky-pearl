# 🎰 Lucky Pearl — Premium Online Gaming

A sleek, luxury-themed online gaming website built with **Next.js 14**, **TypeScript**, and **Tailwind CSS**.

## ✨ Features

- **4 Game Modes**: Golden Dragon, Magic City, River, Fire Phoenix
- **Live jackpot counter** that ticks up in real time
- **Age verification modal** with localStorage persistence
- **Animated particle system** hero section
- **Responsive design** — mobile-first, looks great on all devices
- **Individual game pages** with full details for all 4 games
- **VIP tier system** (Pearl → Jade → Gold → Dragon)
- **Luxury aesthetic**: Cinzel + Cormorant Garamond fonts, gold shimmer text, dark navy palette
- **Real customer accounts**: "Join Now" creates an account (not just a lead form) and signs the customer straight into a **/dashboard** with their profile and quick-launch game links; returning customers can log back in

---

## 🚀 Getting Started

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the site. In dev, accounts are stored in a local SQLite file (`local.db`, auto-created, gitignored) — no extra setup needed.

---

## 🔐 Accounts & the customer dashboard

"Join Now" and "Log In" (in the navbar) create/authenticate real accounts, stored via [`@libsql/client`](https://github.com/tursodatabase/libsql-client-ts) in `lib/db.ts`. Passwords are hashed with bcrypt; sessions are a signed, httpOnly JWT cookie (`lib/auth.ts`). Logged-in customers land on `/dashboard` (`app/dashboard/page.tsx`).

**Local dev**: works out of the box — writes to a local SQLite file at `./local.db`.

**Production**: the local file won't persist on Vercel's serverless filesystem, so before deploying:
1. Create a free database at [turso.tech](https://turso.tech).
2. Set these environment variables in Vercel (Project Settings → Environment Variables):
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `SESSION_SECRET` — any long random string (generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
3. New signups still notify your `DISCORD_WEBHOOK_URL` (if set) for visibility, but no longer gate dashboard access — accounts get instant access.

### Forgot password

The Log In modal has a "Forgot password?" link → `/api/auth/forgot-password` emails a one-time reset link (30 min expiry) to `/reset-password?token=...`, which sets a new password and logs the customer straight in. Emails are sent via [Resend](https://resend.com):

1. Create a free Resend account and API key.
2. Set `RESEND_API_KEY` as an environment variable.
3. Until you verify your own domain in Resend, reset emails send from Resend's shared test address and can only be delivered to the email you signed up to Resend with — verify a domain and set `RESEND_FROM_EMAIL` to send to real customers.

Without `RESEND_API_KEY` set, reset requests fail silently (logged server-side) — the UI always shows a generic "check your email" message either way, so it never reveals whether an account exists for a given email.

---

## 📦 Deploy to Vercel

### Option 1: One-click via Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts — Vercel auto-detects Next.js. Done in ~2 minutes.

### Option 2: Push to GitHub → Connect Vercel

1. Push this repo to GitHub:
```bash
git init
git add .
git commit -m "Initial Lucky Pearl build"
git remote add origin https://github.com/YOUR_USERNAME/lucky-pearl.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo
3. Vercel detects Next.js automatically — click **Deploy**
4. Your site is live! Vercel provides a free `.vercel.app` URL + custom domain support

---

## 📁 Project Structure

```
lucky-pearl/
├── app/
│   ├── layout.tsx          # Root layout + fonts + metadata
│   ├── page.tsx            # Homepage (all sections)
│   ├── globals.css         # Global styles + animations
│   ├── dashboard/
│   │   ├── page.tsx        # Customer dashboard (protected)
│   │   └── LogoutButton.tsx
│   ├── reset-password/
│   │   ├── page.tsx        # Suspense wrapper (needs useSearchParams)
│   │   └── ResetPasswordForm.tsx
│   ├── api/auth/
│   │   ├── signup/route.ts          # Create account + start session
│   │   ├── login/route.ts           # Verify credentials + start session
│   │   ├── logout/route.ts          # Clear session
│   │   ├── me/route.ts              # Current session lookup (for the navbar)
│   │   ├── forgot-password/route.ts # Email a reset link
│   │   └── reset-password/route.ts  # Consume a reset link, set new password
│   └── games/
│       └── [slug]/
│           └── page.tsx    # Individual game pages
├── components/
│   ├── Navbar.tsx          # Fixed nav + Join/Log In/Forgot Password modals
│   ├── Hero.tsx            # Animated hero + live jackpot
│   ├── GamesSection.tsx    # 4 game cards with hover effects
│   ├── VIPSection.tsx      # 4-tier VIP membership
│   ├── SupportSection.tsx  # Trust + support features
│   ├── AgeVerification.tsx # 18+ gate modal
│   └── Footer.tsx          # Full footer
├── lib/
│   ├── db.ts               # libSQL/Turso client + schema
│   ├── auth.ts              # Password/session helpers
│   ├── email.ts             # Resend email sending
│   └── gamePlayUrls.ts      # External play links per game
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

---

## 🎮 Game Pages

Each game has a dedicated page at `/games/[slug]`:

| Game | Slug |
|------|------|
| Golden Dragon | `/games/golden-dragon` |
| Magic City | `/games/magic-city` |
| River | `/games/river` |
| Fire Phoenix | `/games/fire-phoenix` |

---

## 🛠️ Customization

- **Colors**: Edit `tailwind.config.js` — `gold`, `pearl`, `navy` color scales
- **Game data**: Edit the `gameData` object in `app/games/[slug]/page.tsx`
- **Jackpot**: Modify `JACKPOT_START` in `components/Hero.tsx`
- **VIP Tiers**: Edit the `tiers` array in `components/VIPSection.tsx`

---

## ⚖️ Legal

This is a frontend template only. Ensure your operation is fully licensed and compliant with gaming regulations in all applicable jurisdictions. Must be 18+ to play. Promote responsible gambling.
