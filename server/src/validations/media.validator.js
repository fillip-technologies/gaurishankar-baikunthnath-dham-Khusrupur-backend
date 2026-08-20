import { z } from "zod";

export const galleryPostSchema = z.object({
  body: z.object({
    title: z
      .string()
      .trim()
      .min(3, "Title must be at least 3 characters long")
      .optional(),
    dataType: z.enum(["photos", "wallpaper", "videos"]),
    occasion: z
      .string()
      .trim()
      .min(3, "Occasion can be atleast 3 character long")
      .max(50, "Occasion must not increase more than 50 character")
      .optional(),
    folder: z
      .string()
      .trim()
      .min(1, "Folder name can not be empty")
      .max(50, "Folder name must not exceed 50 characters")
      .optional(),
  }),
});

export const galleryGetSchema = z.object({
  query: z.object({
    page: z.coerce
      .number()
      .int("Page must be an integer")
      .min(1, "Page must be at least 1"),

    dataType: z.enum(["photos", "wallpaper", "videos"]),

    folder: z
      .string()
      .trim()
      .min(1, "Folder name can not be empty")
      .max(50, "Folder name must not exceed 50 characters")
      .optional(),
  }),
});

export const galleryFoldersSchema = z.object({
  query: z.object({
    dataType: z.enum(["photos", "wallpaper", "videos"]),
  }),
});

// Shared field definitions for media coverage articles. Multipart form fields
// arrive as strings; tags/highlights (CSV/newline) and publicationDate are
// parsed into arrays/Date inside the service layer.
const mediaFields = {
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters long")
    .max(200, "Title can not be more than 200 characters"),
  source: z
    .string()
    .trim()
    .min(2, "Source must be at least 2 characters long")
    .max(120, "Source can not be more than 120 characters"),
  category: z.enum(["print", "tv", "digital"]),
  description: z
    .string()
    .trim()
    .min(3, "Description must be at least 3 characters long")
    .max(2000, "Description can not be more than 2000 chracters long"),
  publicationDate: z.string().trim().min(1).max(40).optional(),
  tags: z.string().trim().max(500).optional(),
  highlights: z.string().trim().max(4000).optional(),
  author: z.string().trim().max(120).optional(),
  location: z.string().trim().max(200).optional(),
  readTime: z.string().trim().max(40).optional(),
  quote: z.string().trim().max(600).optional(),
  quoteAuthor: z.string().trim().max(120).optional(),
  status: z.string().trim().max(40).optional(),
};

export const mediaSchema = z.object({
  body: z.object(mediaFields),
});

// Edit: every field optional (partial update; new image also optional).
export const mediaUpdateSchema = z.object({
  body: z
    .object({
      title: mediaFields.title.optional(),
      source: mediaFields.source.optional(),
      category: mediaFields.category.optional(),
      description: mediaFields.description.optional(),
      publicationDate: mediaFields.publicationDate,
      tags: mediaFields.tags,
      highlights: mediaFields.highlights,
      author: mediaFields.author,
      location: mediaFields.location,
      readTime: mediaFields.readTime,
      quote: mediaFields.quote,
      quoteAuthor: mediaFields.quoteAuthor,
      status: mediaFields.status,
    }),
});
