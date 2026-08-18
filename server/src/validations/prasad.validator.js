import { z } from "zod";

export const addPrasadSchema = z.object({
  body: z.object({
    prasadName: z
      .string()
      .min(3, "Prasad name must be at least 3 characters long")
      .max(100, "Prasad name can not be more than 100 characters")
      .trim(),
    priceperkg: z.coerce
      .number()
      .positive("Price per kg must be a positive number"),
    description: z
      .string()
      .min(3, "Description must be at least 3 characters long")
      .max(500, "Description can not be more than 500 characters")
      .optional(),
  }),
});
