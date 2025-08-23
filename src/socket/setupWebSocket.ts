import { Server } from "http";
import { WebSocket, WebSocketServer } from "ws";
import config from "../config";
import { Secret } from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { jwtHelpers } from "../app/helper/jwtHelper";

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
}

const ONLINE_USERS_KEY = "online_users";
export const onlineUsers = new Set<string>();
export const userSockets = new Map<string, ExtendedWebSocket>();

export async function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server });
  console.log("WebSocket server is running");

  wss.on("connection", (ws: ExtendedWebSocket) => {
    console.log("A user connected");

    ws.on("message", async (data: string) => {
      try {
        const parsedData = JSON.parse(data);

        console.log("parsedData ", parsedData);

        switch (parsedData.event) {
          case "authenticate": {
            const token = parsedData.token;

            if (!token) {
              ws.close();
              return ws.send(
                JSON.stringify({
                  event: "authorization",
                  message: "Token is required for authentication!",
                })
              );
            }

            const user = jwtHelpers.verifyToken(token);

            if (!user) {
              ws.close();
              return ws.send(
                JSON.stringify({
                  event: "authorization",
                  message: "Invalid token or user not found!",
                })
              );
            }

            const { id } = user;

            ws.userId = id;
            onlineUsers.add(id);

            userSockets.set(id, ws);

            break;
          }

          case "message": {
            const { receiverId, message, images } = parsedData;

            console.log("ws.userId ", ws.userId);
            if (!ws.userId || !receiverId) {
              console.log("Invalid message payload");
              return;
            }

            let room = await prisma.room.findFirst({
              where: {
                OR: [
                  { senderId: ws.userId, receiverId },
                  { senderId: receiverId, receiverId: ws.userId },
                ],
              },
            });

            if (!room) {
              room = await prisma.room.create({
                data: { senderId: ws.userId, receiverId },
              });
            }

            const chat = await prisma.chat.create({
              data: {
                senderId: ws.userId,
                receiverId,
                roomId: room.id,
                message,
                images: { set: images || [] },
              },
            });

            const receiverSocket = userSockets.get(receiverId);
            if (receiverSocket) {
              receiverSocket.send(
                JSON.stringify({ event: "message", data: chat })
              );
            }
            ws.send(JSON.stringify({ event: "message", data: chat }));
            break;
          }

          case "sendNotification": {
            const { userId, message } = parsedData;
            if (!ws.userId || !userId || !message) {
              console.log("Invalid notification payload");
              return;
            }

            const receiverSocket = userSockets.get(userId);
            if (receiverSocket) {
              receiverSocket.send(
                JSON.stringify({ event: "notification", data: { message } })
              );
            }
            break;
          }

          case "project": {
            ws.send(JSON.stringify({ parsedData }));
            return;
          }

          case "fetchChats": {
            const { receiverId, page, limit } = parsedData;
            if (!ws.userId) {
              console.log("User not authenticated");
              return;
            }

            const room = await prisma.room.findFirst({
              where: {
                OR: [
                  { senderId: ws.userId, receiverId },
                  { senderId: receiverId, receiverId: ws.userId },
                ],
              },
              include: {
                sender: {
                  include: {
                    AthleteInfo: true,
                    ClubInfo: true,
                    BrandInfo: true,
                    IndividualInfo: true,
                  },
                },
                receiver: {
                  include: {
                    AthleteInfo: true,
                    ClubInfo: true,
                    BrandInfo: true,
                    IndividualInfo: true,
                  },
                },
              },
            });

            if (!room) {
              ws.send(JSON.stringify({ event: "fetchChats", data: [] }));
              return;
            }

            const skip = (page - 1) * limit || 0;
            const chats = await prisma.chat.findMany({
              where: { roomId: room.id },
              orderBy: { createdAt: "desc" },
              skip,
              take: limit || undefined, // here if no limit given from the json body it will project whole data
            });

            await prisma.chat.updateMany({
              where: { roomId: room.id, receiverId: ws.userId },
              data: { isRead: true },
            });

            const admin = await prisma.adminProfile.findFirst({});

            const receiverProfile = {
              name:
                room.receiver?.AthleteInfo?.fullName ||
                room.receiver?.ClubInfo?.clubName ||
                room.receiver?.IndividualInfo?.fullName ||
                room.receiver?.BrandInfo?.brandName ||
                (room.receiver.role === "ADMIN"
                  ? admin?.adminImage
                  : "Unknown"),
              image:
                room.receiver?.AthleteInfo?.profileImage ||
                room.receiver?.ClubInfo?.logoImage ||
                room.receiver?.IndividualInfo?.profileImage ||
                room.receiver?.BrandInfo?.logoImage ||
                (room.receiver.role === "ADMIN" ? admin?.adminImage : null),
            };

            ws.send(
              JSON.stringify({
                event: "fetchChats",
                data: chats,
                receiverProfile,
              })
            );
            break;
          }
          case "onlineUsers": {
            const onlineUserList = Array.from(onlineUsers);
            const user = await prisma.user.findMany({
              where: { id: { in: onlineUserList } },
              select: {
                id: true,
                email: true,
                role: true,
              },
            });
            ws.send(
              JSON.stringify({
                event: "onlineUsers",
                data: user,
              })
            );
            break;
          }

          case "unReadMessages": {
            const { receiverId } = parsedData;
            if (!ws.userId || !receiverId) {
              console.log("Invalid unread messages payload");
              return;
            }

            const room = await prisma.room.findFirst({
              where: {
                OR: [
                  { senderId: ws.userId, receiverId },
                  { senderId: receiverId, receiverId: ws.userId },
                ],
              },
            });

            if (!room) {
              ws.send(JSON.stringify({ event: "noUnreadMessages", data: [] }));
              return;
            }

            const unReadMessages = await prisma.chat.findMany({
              where: { roomId: room.id, isRead: false, receiverId: ws.userId },
            });

            const unReadCount = unReadMessages.length;

            ws.send(
              JSON.stringify({
                event: "unReadMessages",
                data: { messages: unReadMessages, count: unReadCount },
              })
            );
            break;
          }

          case "messageList": {
            try {
              // Fetch all rooms where the user is involved
              const rooms = await prisma.room.findMany({
                where: {
                  OR: [{ senderId: ws.userId }, { receiverId: ws.userId }],
                },
                include: {
                  chat: {
                    orderBy: { createdAt: "desc" }, // latest message
                    take: 1,
                  },
                  sender: {
                    include: {
                      AthleteInfo: true,
                      ClubInfo: true,
                      BrandInfo: true,
                      IndividualInfo: true,
                    },
                  },
                  receiver: {
                    include: {
                      AthleteInfo: true,
                      ClubInfo: true,
                      BrandInfo: true,
                      IndividualInfo: true,
                    },
                  },
                },
                orderBy: { updatedAt: "desc" }, // sort inbox by activity
              });

              // Fetch admin info once for ADMIN fallback
              const admin = await prisma.adminProfile.findFirst({});

              // Shape the data like getInboxPreview
              const inboxData = rooms.map((room: any) => {
                const otherUser =
                  room.senderId === ws.userId ? room.receiver : room.sender;
                const latestMessage = room.chat[0];

                return {
                  user: {
                    receiverId: otherUser.id,
                    name:
                      otherUser?.AthleteInfo?.fullName ||
                      otherUser?.ClubInfo?.clubName ||
                      otherUser?.IndividualInfo?.fullName ||
                      otherUser?.BrandInfo?.brandName ||
                      (otherUser.role === "ADMIN" ? "Admin" : "Unknown"),
                    image:
                      otherUser?.AthleteInfo?.profileImage ||
                      otherUser?.ClubInfo?.logoImage ||
                      otherUser?.IndividualInfo?.profileImage ||
                      otherUser?.BrandInfo?.logoImage ||
                      (otherUser.role === "ADMIN" ? admin?.adminImage : null),
                  },
                  lastMessage: latestMessage?.message
                    ? latestMessage.message
                    : latestMessage
                    ? "Sent an image"
                    : "No messages yet",
                  time: latestMessage?.createdAt || room.updatedAt,
                  unreadCount: 0, // extend later with real unread logic
                };
              });

              // Send response back to client
              ws.send(
                JSON.stringify({
                  event: "messageList",
                  success: true,
                  message: "Inbox preview fetched successfully",
                  data: inboxData,
                })
              );
            } catch (error) {
              console.error("Error fetching inbox preview:", error);
              ws.send(
                JSON.stringify({
                  event: "error",
                  success: false,
                  message: "Failed to fetch inbox preview",
                })
              );
            }
            break;
          }

          default:
            console.log("Unknown event type:", parsedData.event);
        }
      } catch (error) {
        console.error("Error handling WebSocket message:", error);
      }
    });

    ws.on("close", () => {
      if (ws.userId) {
        onlineUsers.delete(ws.userId);
        userSockets.delete(ws.userId);

        broadcastToAll(wss, {
          event: "userStatus",
          data: { userId: ws.userId, isOnline: false },
        });
      }
      console.log("User disconnected");
    });
  });

  return wss;
}

function broadcastToAll(wss: WebSocketServer, message: object) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}
