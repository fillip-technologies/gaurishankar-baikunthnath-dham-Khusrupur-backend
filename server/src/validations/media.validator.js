import { z } from "zod";

export const gallerySchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters long")
      .optional(),
    description: z
      .string()
      .trim()
      .min(3, "Description must be at least 3 characters long")
      .optional(),
    dataType: z.enum(["photos", "wallpaper", "mediaCoverage", "videos"]),
  }),
});
