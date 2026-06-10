import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const research = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/research" }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    figure: z.string().optional(),
    figureCaption: z.string().optional(),
  }),
});

export const collections = { research };
