import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../middleware/sendResponse";
import { chatService } from "./chat.service";

const findOrCreateRoom = catchAsync(async (req, res) => {
  const { senderId, receiverId } = req.body;
  const result = await chatService.findOrCreateRoom(senderId, receiverId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Room found or created successfully",
    data: result,
  });
});

const fetchChats = catchAsync(async (req, res) => {
  const userId = req.user.id; // Assuming user ID is stored in req.user
  const { receiverId } = req.params;
  const result = await chatService.fetchChats(userId, receiverId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Chats fetched successfully",
    data: result,
  });
});

const getInboxPreview = catchAsync(async (req, res) => {
  const {id} = req.user;
  const result = await chatService.getInboxPreview(id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Inbox preview fetched successfully",
    data: result,
  });
});

const sendMessage = catchAsync(async (req, res) => {
  const { receiverId, message, images } = req.body;
  const result = await chatService.sendMessage(
    req.user.id,
    receiverId,
    message,
    images
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Message sent successfully",
    data: result,
  });
});

export const chatController = {
  findOrCreateRoom,
  fetchChats,
  getInboxPreview,
  sendMessage,
};
