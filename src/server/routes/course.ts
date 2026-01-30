import { Elysia } from "elysia";

export const courseRoutes = new Elysia({ prefix: "/api" }).get(
  "/modules",
  () => ({
    modules: [
      {
        id: "00",
        title: "História",
        path: "/historia",
        topicCount: 1,
      },
      {
        id: "01",
        title: "Fundamentos",
        path: "/fundamentos",
        topicCount: 4,
      },
      // Poderia adicionar mais módulos aqui ou carregar dinamicamente de arquivos .mdx
    ],
  }),
);
