import { z } from "zod";

const createTier = z.object({
  title: z.string().min(1, "Title is required"),
  amount: z.number().min(0, "Price must be a positive number"),
  description: z.string(),
  type: z.enum(["INDIVIDUAL", "BRAND"]),
  features: z.array(z.enum(["CONTENT", "BANNER", "PROFILE"])).optional(),
});

const editTier = z.object({
  title: z.string().min(1, "Title is required").optional(),
  amount: z.number().min(0, "Price must be a positive number").optional(),
  description: z.string().optional(),
  type: z.enum(["INDIVIDUAL", "BRAND"]).optional(),
  features: z.array(z.enum(["CONTENT", "BANNER", "PROFILE"])).optional(),
});

const addSports = z.object({
  name: z.string().min(1, "Name is required"),
});

const changeStatus = z.object({
  status: z.enum(["ACTIVE", "HIDE", "BLOCKED"]),
});

export const adminValidation = {
  createTier,
  editTier,
  addSports,
  changeStatus,
};
