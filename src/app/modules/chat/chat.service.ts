import { userSockets } from "../../../socket/setupWebSocket";
import { prisma } from "../../../utils/prisma";

// Create or find a room for 1-to-1 chat
const findOrCreateRoom = async (senderId: string, receiverId: string) => {
  const existingRoom = await prisma.room.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
  });

  if (existingRoom) return existingRoom;

  return await prisma.room.create({
    data: {
      senderId,
      receiverId,
    },
  });
};

const sendMessage = async (
  senderId: string,
  receiverId: string,
  message: string,
  images: string[] = []
) => {
  // 1️⃣ Find or create room
  const room = await findOrCreateRoom(senderId, receiverId);

  // 2️⃣ Save the message in DB
  const newMessage = await prisma.chat.create({
    data: {
      senderId,
      receiverId,
      message,
      images: { set: images || [] },
      roomId: room.id,
    },
    include: {
      sender: true,
      receiver: true,
    },
  });

  // 3️⃣ Send to the receiver if they are online
  const receiverSocket = userSockets.get(receiverId);
  if (receiverSocket) {
    receiverSocket.send(
      JSON.stringify({
        event: "message",
        data: newMessage,
      })
    );
  }

  return newMessage;
};

const fetchChats = async (userId: string, receiverId: string) => {
  const room = await prisma.room.findFirst({
    where: {
      OR: [
        { senderId: userId, receiverId },
        { senderId: receiverId, receiverId: userId },
      ],
    },
  });

  if (!room) return [];

  const messages = await prisma.chat.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "asc" },
  });

  return messages;
};

const getInboxPreview = async (userId: string) => {
  const rooms = await prisma.room.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    include: {
      chat: {
        orderBy: { createdAt: "desc" }, // latest message first
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

  const admin = await prisma.adminProfile.findFirst({});

  const inboxData = rooms.map((room: any) => {
    const otherUser = room.senderId === userId ? room.receiver : room.sender;
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
      unreadCount: 0, // extend with actual unread logic later
    };
  });

  return {
    success: true,
    message: "Inbox preview fetched successfully",
    data: inboxData,
  };
};


const getOnlineUsers = async (userIds: string[]) => {
  const onlineUsers = await prisma.user.findMany({
    where: {
      id: { in: userIds },
    },
    select: {
      id: true,
      AthleteInfo: {
        select: {
          fullName: true,
          profileImage: true,
        },
      },
      ClubInfo: {
        select: {
          clubName: true,
          logoImage: true,
        },
      },
    },
  });

  return onlineUsers.map((user: any) => ({
    id: user.id,
    name: user.AthleteInfo?.fullName || user.ClubInfo?.clubName || "Unknown",
    image: user.AthleteInfo?.profileImage || user.ClubInfo?.logoImage || null,
  }));
};

export const chatService = {
  sendMessage,
  fetchChats,
  getInboxPreview,
  getOnlineUsers,
  findOrCreateRoom,
};
