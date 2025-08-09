import { z } from "zod";

const createTier = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.number().min(0, "Price must be a positive number"),
  description: z.string(),
  type: z.enum(["INDIVIDUAL", "BRAND"]),
  features: z.array(z.enum(["CONTENT", "BANNER", "PROFILE"])).optional(),
});

export const adminValidation = {
  createTier,
};
