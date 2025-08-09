import { Router } from "express";
import { chatController } from "./chat.controller";

const router = Router();

router.post("/find-or-create-room", chatController.findOrCreateRoom);
router.get("/:receiverId", chatController.fetchChats);
router.get("/inbox-preview", chatController.getInboxPreview);
router.post("/send-message", chatController.sendMessage);



export const chatRoutes = router;
