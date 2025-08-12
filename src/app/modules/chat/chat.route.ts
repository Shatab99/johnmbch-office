import { Router } from "express";
import { chatController } from "./chat.controller";
import auth from "../../middleware/auth";
import { Role } from "@prisma/client";
import { fileUploader } from "../../helper/uploadFile";
import { parseBodyMiddleware } from "../../middleware/parseBodyData";
import validateRequest from "../../middleware/validateRequest";
import { chatValidation } from "./chat.validation";

const router = Router();

router.post(
  "/find-or-create-room",
  auth(Role.USER),
  chatController.findOrCreateRoom
);
router.get("/inbox-preview", auth(Role.USER), chatController.getInboxPreview);
router.get("/:receiverId", auth(Role.USER), chatController.fetchChats);
router.post(
  "/send-message",
  auth(Role.USER),
  fileUploader.uploadUniversal,
  parseBodyMiddleware,
  validateRequest(chatValidation.sendChatValidation),
  chatController.sendMessage
);

export const chatRoutes = router;
