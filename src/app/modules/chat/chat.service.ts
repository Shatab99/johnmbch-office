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
  const room = await findOrCreateRoom(senderId, receiverId);

  const newMessage = await prisma.chat.create({
    data: {
      senderId,
      receiverId,
      message,
      images,
      roomId: room.id,
    },
    include: {
      sender: true,
      receiver: true,
    },
  });

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
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      sender: {
        include: {
          AthleteInfo: true,
          ClubInfo: true,
        },
      },
      receiver: {
        include: {
          AthleteInfo: true,
          ClubInfo: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return rooms.map((room: any) => {
    const otherUser = room.senderId === userId ? room.receiver : room.sender;
    const latestMessage = room.chat[0];

    return {
      user: {
        id: otherUser.id,
        name:
          otherUser?.AthleteInfo?.fullName ||
          otherUser?.ClubInfo?.clubName ||
          "Unknown",
        image:
          otherUser?.AthleteInfo?.profileImage ||
          otherUser?.ClubInfo?.logoImage ||
          null,
      },
      lastMessage: latestMessage?.message || "",
      time: latestMessage?.createdAt || room.updatedAt,
      unreadCount: 0,
    };
  });
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
