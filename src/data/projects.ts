import downloader from "../assets/work/downloader.png";
import dlGraphite from "../assets/work/downloader-graphite-amber.png";
import dlCarbon from "../assets/work/downloader-carbon-cyan.png";
import dlPaper from "../assets/work/downloader-paper-rust.png";
import dlObsidian from "../assets/work/downloader-obsidian-violet.png";
import evrodark from "../assets/work/evrodark.png";
import fundoora from "../assets/work/fundoora.png";
import neonBrew from "../assets/work/neon-brew.png";
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
      "Electron",
      "React",
      "Tailwind CSS",
      "Framer Motion",
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
    ],
  },
  {
    slug: "neon-brew",
    index: "A3",
    title: "Neon Brew",
    year: "2026",
    kind: "Slot game · Design & dev",
    stack: ["PixiJS", "TypeScript", "WebGL"],
    stat: "Art direction + code",
    cover: neonBrew,
    coverAlt:
      "Neon Brew slot game: a frog alchemist beside five reels in a night-time potion workshop",
    status: "Designed and built in 2026",
    links: [],
    summary:
      "A potion-brewing slot game with a frog alchemist, five reels in a moonlit workshop and two extra rows sealed in wax — drawn, designed and built end to end.",
    brief:
      "I wanted to see how far a slot game goes when the same person draws the world and writes the code: one character with attitude, a night-time workshop, and an interface you can read at a glance.",
    built: [
      "The full art direction: the frog alchemist, the moonlit workshop, the symbol set and the wax-seal row locks.",
      "The game itself, rendered in WebGL with PixiJS and written in TypeScript.",
      "The game interface: balance, bet stepper, spin, auto-play, turbo and a bonus button.",
      "A scene composition that frames the reels with the character and the potion flask without crowding them.",
    ],
    details: [
      "High-pay icons — goggles, mortar, spellbook, ruby — stand apart from bold, colour-coded card letters.",
      "Two extra reel rows wait behind wax seals above the grid.",
      "One person from character sketch to spin button.",
    ],
  },
  {
    slug: "fundoora",
    index: "A4",
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
    index: "A5",
    title: "Evro Dark",
    year: "2024",
    kind: "VS Code theme",
    stack: ["VS Code theming API", "JSON", "Colour design"],
    stat: "3,930 installs",
    cover: evrodark,
    coverAlt: "Two VS Code windows using the Evro Dark colour theme",
    status: "Published on the VS Code Marketplace",
    links: [
      {
        label: "Marketplace",
        href: "https://marketplace.visualstudio.com/items?itemName=EvroHQ.evro-dark",
      },
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
