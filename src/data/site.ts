export const site = {
  name: "Christophe Kirkoussis",
  first: "Christophe",
  last: "Kirkoussis",
  role: "Full-stack developer & music producer",
  location: "Belgium",
  timeZone: "Europe/Brussels",
  email: "kirkoussis.christophe@hotmail.com",
  url: "https://evrohq.github.io/portfolio-v1/",
  description:
    "Christophe Kirkoussis is a full-stack developer and music producer based in Belgium, building desktop apps, AI pipelines, games, web platforms and the interfaces on top.",
  status: "Open to freelance work",
  // The v1 résumé link (christophekirkoussis.com/resume.pdf) no longer resolves.
  // Set a working URL here and a "Résumé" link appears in the nav and footer.
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
      "Tailwind CSS",
      "SCSS",
      "PixiJS",
      "GSAP · Framer Motion",
    ],
  },
  {
    id: "PR",
    name: "Systems",
    note: "What does the work",
    tools: [
      "Python",
      "FastAPI",
      "Celery · Redis",
      "Node.js",
      "Electron",
      "MongoDB · Supabase",
      "Stripe · Firebase",
    ],
  },
  {
    id: "FX",
    name: "Intelligence",
    note: "What makes decisions",
    tools: ["Claude API", "Audio analysis", "DSP pipelines", "Genre detection"],
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
