import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

import sitemap from "@astrojs/sitemap";
import purgecss from "astro-purgecss";

export default defineConfig({
  site: "https://aprendac.online",
  integrations: [
    mdx(),
    sitemap(),
    // purgecss({
    //   fontFace: true,
    //   safelist: ["html", "body", /^astro-/, /^toc-/, /^nav-/, "active"],
    // }),
  ],
  server: {
    port: 4000,
  },
  prefetch: {
    prefetchAll: true, // Prefetch de todos os links visíveis para navegação instantânea
    defaultStrategy: "viewport", // Pré-carrega quando o link aparece no viewport
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
});
