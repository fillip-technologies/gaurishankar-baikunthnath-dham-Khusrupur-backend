import { z } from "zod";

export const addPrasadSchema = z.object({
  body: z.object({
    prasadName: z
      .string()
      .trim()
      .min(3, "Prasad name must be at least 3 characters long")
      .max(100, "Prasad name can not be more than 100 characters"),
    pricePerKg: z.coerce
      .number()
      .positive("Price per kg must be a positive number"),
    description: z
      .string()
      .min(3, "Description must be at least 3 characters long")
      .max(500, "Description can not be more than 500 characters")
      .optional(),
  }),
});

export const updatePrasadSchema = z.object({
  body: z.object({
    prasadName: z
      .string()
      .trim()
      .min(3, "Prasad name must be at least 3 characters long")
      .max(100, "Prasad name can not be more than 100 characters")
      .optional(),
    pricePerKg: z.coerce
      .number()
      .positive("Price per kg must be a positive number")
      .optional(),
    description: z
      .string()
      .trim()
      .min(3, "Description must be at least 3 characters long")
      .max(500, "Description can not be more than 500 characters")
      .optional(),
  }),
});

export const bookPrasadSchema = z.object({
  body: z.object({
    // Which prasad to order. The price/amount is looked up on the server from
    // this id — the client never sends the amount.
    prasadId: z
      .string()
      .trim()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid prasadId"),
    // Quantity is in kilograms: min 0.5 kg (500 g), max 5 kg, in 0.25 kg (250 g)
    // steps. Enforced server-side so a crafted request can't bypass the UI stepper.
    quantity: z.coerce
      .number()
      .min(0.5, "Minimum quantity is 500 g")
      .max(5, "Maximum quantity is 5 kg")
      .multipleOf(0.25, "Quantity must be in steps of 250 g"),
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
    // Delivery address for shipping the prasad (e-commerce style). Landmark is
    // optional; the rest are required so orders are always fulfillable.
    address: z.object({
      line1: z
        .string()
        .trim()
        .min(3, "Address must be at least 3 characters long")
        .max(200, "Address can not be more than 200 characters"),
      landmark: z
        .string()
        .trim()
        .max(120, "Landmark can not be more than 120 characters")
        .optional(),
      city: z
        .string()
        .trim()
        .min(2, "City is required")
        .max(60, "City can not be more than 60 characters"),
      state: z
        .string()
        .trim()
        .min(2, "State is required")
        .max(60, "State can not be more than 60 characters"),
      pincode: z
        .string()
        .trim()
        .regex(/^\d{6}$/, "Pincode must be 6 digits"),
    }),
  }),
});

export const verifyPrasadBookingSchema = z.object({
  body: z.object({
    razorpayOrderId: z.string().trim().min(1, "razorpayOrderId is required"),
    razorpayPaymentId: z.string().trim().min(1, "razorpayPaymentId is required"),
    razorpaySignature: z.string().trim().min(1, "razorpaySignature is required"),
  }),
});
