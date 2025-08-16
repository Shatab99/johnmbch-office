import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  newPassword: z.string().min(6).optional(),
});

export const profileValidation = {
  updateProfileSchema,
};
