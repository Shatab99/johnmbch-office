import { prisma } from "../../../utils/prisma";

const createTier = async (data: any) => {
  const result = await prisma.tier.create({
    data,
  });
  return result;
};

const getAllTiers = async (query: any) => {
  const { type } = query;
  const tiers = await prisma.tier.findMany({
    where: {
      type: type ? { equals: type.toUpperCase() } : undefined,
    },
  });
  return tiers;
};

export const adminService = {
  createTier,
  getAllTiers,
};
