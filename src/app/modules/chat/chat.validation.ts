import { z } from "zod";

const sendChatValidation = z.object({
  receiverId: z.string().min(1, "Receiver ID is required"),
  message: z.string().min(1, "Message is required"),
});

export const chatValidation = {
  sendChatValidation,
};
