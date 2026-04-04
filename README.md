# StreamVault — Web Streaming App

A modern streaming web app built with **Next.js 14**, supporting three providers:

- 🌐 **StreamPlay** — Global movies & TV shows via TMDB + public embed servers
- 🎭 **KissKh** — K-Drama, C-Drama, Anime with native HLS playback
- 🎬 **PencuriMovie** — Asian cinema (Indonesian/Malay/India)

## Features

- 🎨 Dark glassmorphism UI with animated gradients
- 🔍 Search across all providers
- 📺 HLS video player (KissKh direct M3U8 streams)
- 🖥️ Multi-server embed player (StreamPlay)
- 📋 Episode lists, cast, trailers
- 📱 Fully responsive

## Deploy on Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Environment Variables (optional)

| Variable | Description | Default |
|---|---|---|
| `TMDB_API` | Your TMDB v3 API key | Public demo key |

Get a free TMDB key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)

## Run Locally

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS + custom CSS
- **Scraping**: axios + cheerio
- **Video**: HLS.js (M3U8), iframe embeds
- **Providers**: PencuriMovie, KissKh, StreamPlay
