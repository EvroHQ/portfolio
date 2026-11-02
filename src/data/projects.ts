import downloader from "../assets/work/downloader.png";
import dlGraphite from "../assets/work/downloader-graphite-amber.png";
import dlCarbon from "../assets/work/downloader-carbon-cyan.png";
import dlPaper from "../assets/work/downloader-paper-rust.png";
import dlObsidian from "../assets/work/downloader-obsidian-violet.png";
import evrodark from "../assets/work/evrodark.png";
import fundoora from "../assets/work/fundoora.png";
import neonBrew from "../assets/work/neon-brew.png";
import lunch from "../assets/work/lunch.png";
import type { ImageMetadata } from "astro";

export interface Project {
  slug: string;
  index: string;
  title: string;
  year: string;
  kind: string;
  stack: string[];
  stat: string;
  /** a real screenshot, or a generated plate drawn by ProjectCover */
  cover: ImageMetadata | "plate-mix";
  coverAlt: string;
  gallery?: { src: ImageMetadata; alt: string }[];
  status: string;
  links: { label: string; href: string }[];
  summary: string;
  brief: string;
  built: string[];
  details: string[];
}

export const projects: Project[] = [
  {
    slug: "ai-mixing-mastering",
    index: "A1",
    title: "AI Mixing & Mastering",
    year: "2026",
    kind: "Web app · Audio engine",
    stack: [
      "Next.js 16",
      "React 19",
      "FastAPI",
      "Celery",
      "Redis",
      "Backblaze B2",
    ],
    stat: "32 stems in, master out",
    cover: "plate-mix",
    coverAlt:
      "Stem waveforms feeding a master bus, with per-genre loudness targets",
    status: "In development",
    links: [
      {
        label: "Source",
        href: "https://github.com/EvroHQ/AI-Mixing-Mastering",
      },
    ],
    summary:
      "Upload your stems, let the engine detect the genre, and get a balanced mix and a streaming-ready master in minutes.",
    brief:
      "As a producer I know the gap between a finished idea and a finished record: the mix. I wanted a tool that closes it without a studio, and that respects how each genre is supposed to hit.",
    built: [
      "A Python audio engine split into analyzer, mixer and masterer stages, orchestrated as one pipeline.",
      "Genre detection that selects presets: stem balance, EQ, compression and panning per style.",
      "Mastering with multi-band processing, loudness normalisation and true-peak limiting.",
      "A FastAPI backend that queues jobs to Celery workers over Redis, with files on Backblaze B2.",
      "A Next.js 16 studio with chunked uploads (Uppy) and waveform playback (wavesurfer.js).",
    ],
    details: [
      "Loudness targets per genre: −8 to −9 LUFS for house and techno, −14 LUFS for acoustic.",
      "Every master is held to ≤ −1 dBTP true peak and checked for mono compatibility.",
      "Up to 32 stems in WAV, AIFF, FLAC or MP3, processed in under three minutes.",
    ],
  },
  {
    slug: "evrohq-downloader",
    index: "A2",
    title: "EvroHQ Downloader",
    year: "2026",
    kind: "Desktop app · Windows",
    stack: [
      "Electron 31",
      "React 18",
      "Tailwind CSS",
      "Framer Motion",
      "electron-vite",
      "electron-builder",
      "yt-dlp",
      "ffmpeg",
    ],
    stat: "v2.3.5 · 7 themes",
    cover: dlCarbon,
    coverAlt:
      "EvroHQ Downloader window previewing a six-track playlist ready to download",
    gallery: [
      { src: dlGraphite, alt: "Graphite & Amber theme" },
      { src: downloader, alt: "EvroHQ theme" },
      { src: dlObsidian, alt: "Obsidian & Violet theme" },
      { src: dlPaper, alt: "Paper & Rust light theme" },
    ],
    status: "Released · open source (MIT)",
    links: [
      {
        label: "Download",
        href: "https://github.com/EvroHQ/EvroHQ-Downloader/releases/latest",
      },
      { label: "Source", href: "https://github.com/EvroHQ/EvroHQ-Downloader" },
    ],
    summary:
      "A clean Windows app to pull audio or video from YouTube and SoundCloud — single tracks or whole playlists — with nothing else to install.",
    brief:
      "Command-line tools are powerful but hostile. I wanted the power of yt-dlp and ffmpeg behind an interface that a non-developer can trust on the first click.",
    built: [
      "An Electron + React app with yt-dlp, ffmpeg and a tiny JS runtime bundled, so there is no setup.",
      "Live previews with thumbnail, channel, duration and estimated file size before anything downloads.",
      "Playlist mode: preview every track, pick the ones you want, save into a folder named after the playlist.",
      "In-place updates for both the app and yt-dlp, so downloads keep working when YouTube changes.",
    ],
    details: [
      "Audio as WAV 44.1 kHz or MP3 320 kbps; video up to 4K, or an H.264 + AAC “compatible” mode for editors.",
      "Trim to a time range, split by chapters, and embed tags and cover art.",
      "Seven hand-tuned themes, dark and light; the last one is remembered.",
      "Built with electron-vite, packaged for Windows with electron-builder and released through GitHub Actions; electron-updater ships each release from GitHub Releases.",
      "Settings persist with electron-store; icons by lucide-react, toasts by sonner. Plain JavaScript, MIT licensed.",
    ],
  },
  {
    slug: "neon-brew",
    index: "A3",
    title: "Neon Brew",
    year: "2026",
    kind: "Slot game · Design & dev",
    stack: [
      "Svelte 5",
      "PixiJS 8",
      "TypeScript",
      "GSAP",
      "Spine 4.2",
      "Web Audio",
      "Stake Engine",
    ],
    stat: "Art direction + code",
    cover: neonBrew,
    coverAlt:
      "Neon Brew slot game: a frog alchemist beside five reels in a night-time potion workshop",
    status: "Designed and built in 2026 for Stake Engine",
    links: [],
    summary:
      "A potion-brewing slot game with a frog alchemist, five reels in a moonlit workshop and two extra rows sealed in wax — art-directed, designed and built end to end.",
    brief:
      "I wanted to see how far a slot game goes when the same person directs the world and writes the code: one character with attitude, a night-time workshop, and an interface you can read at a glance.",
    built: [
      "The full art direction: the frog alchemist, the moonlit workshop, the symbol set and the wax-seal row locks.",
      "The game, rendered with PixiJS 8 on a fixed 1920×1080 stage (1080×1920 in portrait), animated with GSAP and pixi-filters.",
      "A Spine 4.2 rig for the frog, played back in Pixi, plus a Web Audio sound layer.",
      "The interface in Svelte 5: bet bar, menus, rules and bonus screens over the canvas.",
      "A TypeScript game engine that turns each spin into a book of events in Stake's RGS format, with RTP simulation, maths export and a mock RGS server.",
    ],
    details: [
      "High-pay icons — goggles, mortar, spellbook, ruby — stand apart from bold, colour-coded card letters.",
      "Two extra reel rows wait behind wax seals above the grid.",
      "An asset pipeline in Python: GPU background removal (BiRefNet), Real-ESRGAN upscaling and ffmpeg, feeding the symbols, UI and Spine rig.",
      "Images generated with ChatGPT, animations with Kling AI and music with Suno, finished in Ableton.",
      "Browser tests with Playwright.",
    ],
  },
  {
    slug: "lunch",
    index: "A4",
    title: "Lunch",
    year: "2026",
    kind: "B2B ordering app · Full stack",
    stack: [
      "React Native Web",
      "Expo",
      "TypeScript",
      "Zustand",
      "Node.js",
      "Express",
      "Supabase",
      "Stripe Connect",
    ],
    stat: "Fully automated",
    cover: lunch,
    coverAlt:
      "Lunch ordering app: a sandwich menu by category, one item in the basket and a “Voir ma commande” bar",
    status: "Live · Vercel + Railway",
    links: [],
    summary:
      "A lunch ordering app for companies that get their staff's lunch from a partner sandwich shop: each company gets its own app, built for it, where its workers and staff order and pay themselves — and everything after that runs on its own.",
    brief:
      "Companies often work with one local sandwich shop to feed their workers and staff at lunch. On a work site or in an office, someone usually ends up collecting those orders by phone, on a list or in a group chat, then chasing the money. I built a dedicated app per company instead: every employee orders directly, pays upfront, and the orders, the restaurant recap and the payouts are handled automatically.",
    built: [
      "One app per company, set up for that company: its staff open the link, order and pay, with no one in the middle collecting orders.",
      "A web app in Expo and React Native Web (React 19, TypeScript strict), with file-based routes and tab navigation via expo-router.",
      "A basket in Zustand, kept in the browser so an order survives a reload.",
      "A Node.js / Express API with CORS and rate limiting, on Railway, backed by Supabase (PostgreSQL).",
      "Payments through Stripe Connect and Stripe Checkout — Bancontact, Visa and Mastercard — confirmed by webhooks.",
      "Full automation with node-cron: a daily HTML recap of the orders is emailed to the restaurant at 10:10 via Resend, and the restaurant is paid out every Saturday at 8:00.",
    ],
    details: [
      "The menu comes from an external REST API, filled in by HTML scraping, and cached in memory for an hour.",
      "Front served as a static site on Vercel, watched with Vercel Analytics and Speed Insights.",
      "Set in Lato, with a sticky category bar and an order bar that follows the basket.",
    ],
  },
  {
    slug: "fundoora",
    index: "A5",
    title: "Fundoora",
    year: "2025",
    kind: "Crowdfunding platform",
    stack: [
      "Next.js",
      "MongoDB",
      "Firebase Auth",
      "Stripe",
      "Stripe Identity",
      "PayPal",
      "next-intl",
      "Tiptap",
    ],
    stat: "Payments + ID checks",
    cover: fundoora,
    coverAlt:
      "Fundoora share image: “Ensemble, donnons vie aux rêves et soutenons les urgences”",
    status: "Built 2025 · private codebase",
    links: [],
    summary:
      "A crowdfunding platform for what matters most — personal dreams and urgent needs — with verified accounts, secure payments and funds held until the goal is met.",
    brief:
      "Most crowdfunding sites are built for products and launches. Fundoora is for people: someone with a dream to fund or an emergency to get through, who needs to raise money quickly and be trusted while doing it.",
    built: [
      "The whole platform in Next.js, from the public campaign pages to the API routes behind them, on MongoDB.",
      "Campaign creation and management with a rich-text story editor (Tiptap), image cropping and uploads.",
      "Secure donations through a main Stripe account, with PayPal as an alternative and an optional tip for the platform.",
      "Account verification: Firebase authentication, mandatory phone-number validation and Stripe Identity ID checks.",
      "Funds held until the goal is reached or the creator requests a withdrawal.",
    ],
    details: [
      "Two kinds of campaigns at the core: dreams and emergencies.",
      "Bilingual from day one with next-intl.",
      "Monitoring with Sentry and Vercel Speed Insights; Turnstile and reCAPTCHA keep bots out.",
    ],
  },
  {
    slug: "evro-dark",
    index: "A6",
    title: "Evro Dark",
    year: "2024",
    kind: "VS Code theme",
    stack: ["VS Code theming API", "JSON", "Colour design"],
    stat: "3,930 installs",
    cover: evrodark,
    coverAlt: "Two VS Code windows using the Evro Dark colour theme",
    status: "Published on the VS Code Marketplace and Open VSX",
    links: [
      {
        label: "Marketplace",
        href: "https://marketplace.visualstudio.com/items?itemName=EvroHQ.evro-dark",
      },
      { label: "Open VSX", href: "https://open-vsx.org/extension/EvroHQ/evro-dark" },
      { label: "Source", href: "https://github.com/EvroHQ/EvroDark" },
    ],
    summary:
      "A colour theme for nocturnal coding sessions, tuned to stay readable in both bright offices and dark rooms.",
    brief:
      "I spend my nights in an editor. Evro Dark is the palette I wanted to live in: calm enough for hours, with syntax colours that separate meaning instead of decorating it.",
    built: [
      "A complete workbench and syntax theme for VS Code, from the activity bar to the terminal.",
      "A palette balanced for long sessions: low-glare surfaces with distinct, desaturated token colours.",
      "Recommended editor settings for ligatures, a smooth caret and readable font sizes.",
    ],
    details: [
      "Nearly four thousand developers have installed it from the Marketplace.",
      "Open source under MIT.",
    ],
  },
];
