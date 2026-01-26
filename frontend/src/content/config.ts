import { defineCollection, z } from "astro:content";

const course = defineCollection({
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().default(99),
    duration: z.string().optional().default("10 min"),
    difficulty: z
      .enum(["Iniciante", "Intermediário", "Avançado"])
      .default("Iniciante"),
    tags: z.array(z.string()).optional().default([]),
    updated: z.date().optional(),
    module: z.string().optional(),
  }),
});

export const collections = {
  course, // "course" será a pasta onde colocaremos os MDs
};
