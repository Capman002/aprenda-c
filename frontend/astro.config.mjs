import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://aprendac.online", // URL do seu site
  integrations: [mdx(), sitemap()],
  server: {
    port: 4000,
  },
  prefetch: {
    defaultStrategy: "hover", // Estratégia eficiente: carrega apenas ao passar o mouse
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
});
