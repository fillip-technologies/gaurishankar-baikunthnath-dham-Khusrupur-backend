import { z } from "zod";

export const poojaSchema = z.object({
  body: z.object({
    poojaName: z
      .string()
      .trim()
      .min(3, "Pooja name must be atleast 3 characters long!")
      .max(100, "Pooja name must not increse 100 chracters!"),
    description: z
      .string()
      .trim()
      .min(3, "Description must be atleast 3 characters long!")
      .max(500, "Description must not increse 500 chracters!")
      .optional(),
    price: z.coerce.number().positive("Price must be greater than 0"),
  }),
});

export const updatePoojaSchema = z.object({
  body: z.object({
    poojaName: z
      .string()
      .trim()
      .min(3, "Pooja name must be atleast 3 characters long!")
      .max(100, "Pooja name must not increse 100 chracters!")
      .optional(),
    description: z
      .string()
      .trim()
      .min(3, "Description must be atleast 3 characters long!")
      .max(500, "Description must not increse 500 chracters!")
      .optional(),
    price: z.coerce
      .number()
      .positive("Price must be greater than 0")
      .optional(),
  }),
});

export const bookPoojaSchema = z.object({
  body: z.object({
    // Which pooja to book. The price/amount is looked up on the server from this
    // id — the client never sends the amount.
    poojaId: z
      .string()
      .trim()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid poojaId"),
    quantity: z.coerce.number().positive("Quantity must be a positive number"),
    payer: z.object({
      name: z
        .string()
        .trim()
        .min(3, "Name must be at least 3 characters long")
        .max(50, "Name can not be more than 50 characters"),
      email: z.string().trim().toLowerCase().email("A valid email is required"),
      phone: z
        .string()
        .trim()
        .regex(/^\d{10,14}$/, "Phone number must contain 10-14 digits"),
    }),
  }),
});

export const verifyPoojaBookingSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().trim().min(1, "razorpayOrderId is required"),
    razorpayPaymentId: z.string().trim().min(1, "razorpayPaymentId is required"),
    razorpaySignature: z.string().trim().min(1, "razorpaySignature is required"),
  }),
});
