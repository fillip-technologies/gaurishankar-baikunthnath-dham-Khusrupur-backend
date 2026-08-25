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
    // The date the devotee picks for the pooja. Accepts a YYYY-MM-DD string (or
    // any parseable date) and must not be in the past.
    bookingDate: z.coerce
      .date({ message: "A valid booking date is required" })
      .refine((d) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return d.getTime() >= today.getTime();
      }, "Booking date cannot be in the past"),
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

// Admin-only manual entry for a booking taken offline (cash/UPI at the counter).
// Unlike `bookPoojaSchema` this deliberately allows a past `bookingDate` — the
// admin is often logging a pooja that has already happened — and makes `email`
// optional, since counter devotees frequently don't provide one.
export const manualPoojaBookingSchema = z.object({
  body: z.object({
    poojaId: z
      .string()
      .trim()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid poojaId"),
    quantity: z.coerce.number().positive("Quantity must be a positive number"),
    bookingDate: z.coerce.date({ message: "A valid booking date is required" }),
    // Optional override of the catalogue-computed amount, in rupees (e.g. a
    // negotiated dakshina). When omitted the server prices from the catalogue.
    amount: z.coerce
      .number()
      .positive("Amount must be greater than 0")
      .optional(),
    paymentMode: z.string().trim().max(50).optional(),
    payer: z.object({
      name: z
        .string()
        .trim()
        .min(3, "Name must be at least 3 characters long")
        .max(50, "Name can not be more than 50 characters"),
      email: z
        .string()
        .trim()
        .toLowerCase()
        .email("A valid email is required")
        .optional()
        .or(z.literal("")),
      phone: z
        .string()
        .trim()
        .regex(/^\d{10,14}$/, "Phone number must contain 10-14 digits"),
    }),
  }),
});

// Admin-only status transition from the dashboard. Deliberately a subset of the
// model enum: `pending`/`failed` are system-driven (checkout + payment webhook)
// and must not be settable by a button.
export const updatePoojaBookingStatusSchema = z.object({
  params: z.object({
    id: z
      .string()
      .trim()
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid booking id"),
  }),
  body: z.object({
    status: z.enum(["confirmed", "completed", "cancelled"], {
      message: "Status must be one of confirmed, completed, cancelled",
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
