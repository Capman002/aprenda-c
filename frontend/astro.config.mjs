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
    prefetchAll: true, // Pré-carrega todas as páginas ao hover nos links
    defaultStrategy: "hover", // Estratégia: prefetch ao passar o mouse sobre o link
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
});
