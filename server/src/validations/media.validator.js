import { z } from "zod";

export const galleryPostSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters long")
      .optional(),
    dataType: z.enum(["photos", "wallpaper", "videos"]),
  }),
});

export const galleryGetSchema = z.object({
  query: z.object({
    page: z.coerce
      .number()
      .int("Page must be an integer")
      .min(1, "Page must be at least 1"),

    dataType: z.enum(["photos", "wallpaper", "videos"]),
  }),
});

export const mediaSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters long")
      .max(150, "Title can not be more than 150 characters")
      .optional(),
    description: z
      .string()
      .trim()
      .min(3, "Description must be at least 3 characters long")
      .max(2000, "Description can not be more than 2000 chracters long")
      .optional(),
  }),
});
