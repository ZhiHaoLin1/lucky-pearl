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
- **Promotions section** with animated cards
- **Luxury aesthetic**: Cinzel + Cormorant Garamond fonts, gold shimmer text, dark navy palette

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

Open [http://localhost:3000](http://localhost:3000) to see the site.

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
│   └── games/
│       └── [slug]/
│           └── page.tsx    # Individual game pages
├── components/
│   ├── Navbar.tsx          # Fixed nav with scroll effect
│   ├── Hero.tsx            # Animated hero + live jackpot
│   ├── GamesSection.tsx    # 4 game cards with hover effects
│   ├── PromotionsSection.tsx  # Bonus offers
│   ├── VIPSection.tsx      # 4-tier VIP membership
│   ├── SupportSection.tsx  # Trust + support features
│   ├── AgeVerification.tsx # 18+ gate modal
│   └── Footer.tsx          # Full footer
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
- **Promotions**: Edit the `promotions` array in `components/PromotionsSection.tsx`
- **VIP Tiers**: Edit the `tiers` array in `components/VIPSection.tsx`

---

## ⚖️ Legal

This is a frontend template only. Ensure your operation is fully licensed and compliant with gaming regulations in all applicable jurisdictions. Must be 18+ to play. Promote responsible gambling.
