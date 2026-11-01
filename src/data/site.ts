export const site = {
  name: "Christophe Kirkoussis",
  first: "Christophe",
  last: "Kirkoussis",
  role: "Full-stack developer & music producer",
  location: "Belgium",
  timeZone: "Europe/Brussels",
  email: "kirkoussis.christophe@hotmail.com",
  url: "https://evrohq.github.io/portfolio/",
  description:
    "Christophe Kirkoussis is a full-stack developer and music producer based in Belgium, building full-stack web apps, desktop software and games.",
  status: "Open to freelance work",
  resumeUrl: null as string | null,
  socials: [
    { label: "GitHub", handle: "@evrohq", href: "https://github.com/evrohq" },
    {
      label: "LinkedIn",
      handle: "christophekirkoussis",
      href: "https://www.linkedin.com/in/christophekirkoussis",
    },
    {
      label: "VS Marketplace",
      handle: "Evro Dark theme",
      href: "https://marketplace.visualstudio.com/items?itemName=EvroHQ.evro-dark",
    },
  ],
};

export const chain = [
  {
    id: "IN",
    name: "Interface",
    note: "What people touch",
    tools: [
      "TypeScript",
      "React",
      "Next.js",
      "Astro",
      "Tailwind CSS · SCSS",
      "Electron",
      "PixiJS",
      "GSAP · Framer Motion",
    ],
  },
  {
    id: "PR",
    name: "Systems",
    note: "What does the work",
    tools: ["Node.js", "Python", "FastAPI", "Celery", "Stripe", "Claude API"],
  },
  {
    id: "FX",
    name: "Data",
    note: "What it remembers",
    tools: ["MongoDB", "Supabase", "Firebase", "Redis"],
  },
  {
    id: "OUT",
    name: "Ship",
    note: "What gets it out",
    tools: [
      "Railway",
      "Vercel",
      "Docker",
      "GitHub Actions",
      "electron-builder",
    ],
  },
];
