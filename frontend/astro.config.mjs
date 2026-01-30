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
    defaultStrategy: "hover", // Estratégia eficiente: carrega apenas ao passar o mouse
  },
  markdown: {
    shikiConfig: {
      theme: "github-dark",
    },
  },
});
