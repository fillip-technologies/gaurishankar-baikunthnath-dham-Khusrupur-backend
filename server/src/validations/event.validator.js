import { z } from "zod";

const eventSchema = z.object({
  body: z.object({
    eventName: z.string().trim().min(3).max(100),
    title: z.string().trim().min(3).max(100),
    description: z.string.trim().min(5).max(255),
  }),
});

export default eventSchema;
