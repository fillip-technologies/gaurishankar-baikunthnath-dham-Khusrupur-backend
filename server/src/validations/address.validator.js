import { z } from "zod";

export const addressSchema = z.object({
  body: z.object({
    houseName: z
      .string()
      .trim()
      .min(1, "House name cannot be empty")
      .optional(),

    locality: z.string().trim().min(1, "Locality cannot be empty").optional(),

    district: z.string().trim().min(1, "District cannot be empty").optional(),

    state: z.string().trim().min(1, "State cannot be empty").optional(),

    zipcode: z
      .string()
      .regex(/^\d{6}$/, "Zipcode must be exactly 6 digits")
      .optional(),

    country: z.string().trim().min(1, "Country cannot be empty").optional(),
  }),
});
