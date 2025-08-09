import { z } from "zod";

const sendChatValidation = z.object({
  receiverId: z.string().min(1, "Receiver ID is required"),
  message: z.string(),
  images: z.array(z.string()).optional(),
});

export const chatValidation = {
  sendChatValidation,
};
