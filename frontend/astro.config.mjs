import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  integrations: [mdx()],
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
