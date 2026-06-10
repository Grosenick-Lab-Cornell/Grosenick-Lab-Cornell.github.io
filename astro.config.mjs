import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import yaml from '@rollup/plugin-yaml';

export default defineConfig({
  site: 'https://grosenicklab.org',
  vite: {
    plugins: [tailwindcss(), yaml()],
  },
});
