# Benne n Beans 🥞☕

Official website for **Benne n Beans** — Lucknow's first authentic Karnataka-style Benne Dosa café. Built with Next.js, TypeScript, Tailwind CSS, and Framer Motion.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Animations | Framer Motion v12 |
| Fonts | Playfair Display + Poppins (Google Fonts) |
| Images | Next.js `<Image>` with static export |

---

## Features

- **Hero section** — full-viewport landing with staggered text reveal, floating dosa image, and live stats
- **Signature Items** — card grid showcasing must-try dishes with hover lift effects
- **Dosa Process** — step-by-step preparation walkthrough
- **Coffee Section** — dedicated section for the coffee menu
- **Menu Grid** — full menu with animated price accents
- **Owner Story** — founders' Karnataka background and the story behind the café
- **Gallery** — image grid with hover overlays and slide-up labels
- **Location Section** — address, hours, and map embed
- **Scroll Indicator** — custom animated food-emoji progress bar (desktop), replaces the native scrollbar
- **Responsive** — mobile-first layout across all breakpoints
- **Glass Navbar** — blur + transparency effect that activates on scroll

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
```

### Static Export

The project is configured for static export (`output: 'export'` in `next.config.ts`). After building, the `out/` directory contains the deployable static files.

---

## Project Structure

```
bnb/
├── app/
│   ├── globals.css        # Color system, animations, base styles
│   ├── layout.tsx         # Root layout with fonts
│   └── page.tsx           # Page composition
├── components/
│   ├── Navbar.tsx          # Glass blur navbar with scroll state
│   ├── Hero.tsx            # Full-viewport hero section
│   ├── SignatureItems.tsx  # Featured dishes grid
│   ├── DosaProcess.tsx     # Step-by-step dosa preparation
│   ├── CoffeeSection.tsx   # Coffee menu highlight
│   ├── MenuGrid.tsx        # Full menu grid
│   ├── OwnerStory.tsx      # Founders' story section
│   ├── Gallery.tsx         # Photo gallery with overlays
│   ├── LocationSection.tsx # Address and map
│   ├── ScrollIndicator.tsx # Custom scroll progress indicator
│   └── Footer.tsx          # Footer with links and socials
├── public/
│   └── images/             # Static assets
└── lib/                    # Shared utilities
```

---

## Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--benne-primary` | `#E76F51` | Primary orange — CTAs, accents |
| `--rustic-orange` | `#D35400` | Deep orange — hover states |
| `--coffee` | `#3A241C` | Dark brown — headings, navbar |
| `--butter-gold` | `#F4A261` | Warm gold — highlights, stats |
| `--cream` | `#F3E8DA` | Off-white — page background |
| `--leaf` | `#6A994E` | Green — fresh/organic accents |

---

## License

MIT — see [LICENSE](./LICENSE)
