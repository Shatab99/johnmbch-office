import { z } from "zod";

const createPostValidation = z.object({
  content: z.string().min(2).max(1000).optional(),
});

export const PostValidation = {
  createPostValidation,
};
