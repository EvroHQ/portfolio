import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// GitHub Pages serves this repo under /portfolio-v1. Set BASE_PATH in CI;
// locally the site runs at the root.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site: 'https://evrohq.github.io',
  base,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  image: { responsiveStyles: false },
});
