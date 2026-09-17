# 🎮 myGames

> Bet on your skills, not on luck.

A multi-game 1v1 platform built for users who want to bet **on themselves**, not on meme coins, forex volatility, or 50/50 gambling.

Here at **myGames**, players select skill-based games, place a wager, and go head-to-head against real people — not chance. This is **gamified competition with real payouts.**

---

## 🚀 Features

- 🎙️ **Audio in-game chat**
- 🔁 **Live move updates**
- 🪙 **Crypto & Fiat support for deposits/withdrawals**
- 💸 **Zero or ultra-low commission on cash-ins/outs**
- 🧠 **Player matchmaking by skill level**
- 📈 **Skill-based grading system to reduce abuse**
- 🏆 **Winner takes all — instant cashout**

---

## 🧩 Planned Games

- ♟️ Chess (integrated via [`chess.js`](https://www.npmjs.com/package/chess.js))
- 🎯 More 1v1 skill-based games coming soon...

---

## 🧪 Tech Stack

- **Node.js**
- **Express** – for the backend server
- **Socket.IO** – for real-time multiplayer
- **EJS** – templating engine for views
- **Tailwind CSS** – utility-first CSS framework
- **Chess.js / Chess** – for game logic

---

## 📸 Screenshots

> 🖼️ Paste your screenshots into `/public/screenshots/` or use image URLs.

### 1. Home screen or match lobby

![Screenshot 1](public/screenshots/Screenshot%202025-08-17%20at%201.24.48 AM.png)

![Screenshot 2](public/screenshots/Screenshot%202025-08-17%20at%201.25.10 AM.png)

### 2. In-game screen with live moves

![Screenshot 3](public/screenshots/Screenshot%202025-08-17%20at%201.26.42 AM.png)

![Screenshot 2](public/screenshots/Screenshot%202025-08-17%20at%201.27.12 AM.png)

---

## 🛠️ Getting Started

1. **Clone the repository**

```bash
git clone https://github.com/KHA-ERL/myGames
cd mygames
npm install

🧑‍💻 Development Scripts
| Command             | Purpose                          |
| ------------------- | -------------------------------- |
| `npm run build:css` | Builds and minifies Tailwind CSS |
| `npm run dev:css`   | Watches Tailwind changes         |
| `npm start`         | Starts backend server            |
| `npm run dev`           | Uses nodemon backend server      |

## AI engine and Bing indexing setup

The app exposes crawl-friendly answer signals for Bing, Copilot, and other AI search systems:

- `/robots.txt` allows public crawling and points crawlers to `/sitemap.xml`.
- `/sitemap.xml` lists canonical public URLs with freshness metadata.
- `/llms.txt` summarizes the app, live games, upcoming games, and primary URLs for AI tools that read it.
- Public pages include canonical URLs, descriptions, Open Graph/Twitter metadata, and schema.org JSON-LD.
- Personalized profile pages use `noindex,follow` so crawlers prioritize stable public pages.

Production environment variables:

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | Canonical production origin, for example `https://play.example.com`. Falls back to `APP_URL` or the current request host. |
| `SITE_IMAGE_URL` | Optional absolute URL for a real social preview image. Leave empty until the asset exists. |
| `INDEXNOW_KEY` | Optional Bing/IndexNow API key. When set, the app serves `/<INDEXNOW_KEY>.txt` and `/indexnow.json` reports the URL list and key location. |

For Bing-first indexing, verify the domain in Bing Webmaster Tools, submit `/sitemap.xml`, set `INDEXNOW_KEY`, then submit changed URLs to IndexNow when public pages are added, updated, or removed.


📜 License

ISC License © 2025 KHA-ERL
