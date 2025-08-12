import { prisma } from "../../../utils/prisma";

const createTier = async (data: any) => {
  const result = await prisma.tier.create({
    data: {
      title: data.title,
      amount: data.amount,
      description: data.description,
      type: data.type,
      showProfile: data.features.includes("PROFILE"),
      showContent: data.features.includes("CONTENT"),
      showBanner: data.features.includes("BANNER"),
    },
  });
  return result;
};

const getAllTiers = async (query: any) => {
  const { type } = query;
  const tiers = await prisma.tier.findMany({
    where: {
      type: type ? { equals: type.toUpperCase() } : undefined,
    },
    orderBy: {
      amount: "asc",
    },
  });

  const result = tiers.map((tier) => {
    return {
      id: tier.id,
      title: tier.title,
      amount: tier.amount,
      description: tier.description,
      type: tier.type,
      features: [
        tier.showProfile ? "Your profile will be shown." : "",
        tier.showContent
          ? "You will able to upload write about your company to promote your brand."
          : null,
        tier.showBanner
          ? "You will able to upload a banner to promote your brand."
          : null,
      ].filter(Boolean),
    };
  });

  return result;
};

const deleteTier = async (id: string) => {
  const result = await prisma.tier.delete({
    where: { id },
  });
  return result;
};

const editATier = async (id: string, data: any) => {
  const result = await prisma.tier.update({
    where: { id },
    data,
  });
  return result;
};

const addSports = async (data: any) => {
  const result = await prisma.sports.create({
    data: {
      name: data.name.toLowerCase(),
    },
  });
  return result;
};

const deleteSports = async (id: string) => {
  const result = await prisma.sports.delete({
    where: { id },
  });
  return result;
};

const getAllSports = async () => {
  const result = await prisma.sports.findMany();
  return result;
};

export const adminService = {
  createTier,
  getAllTiers,
  deleteTier,
  addSports,
  editATier,
  deleteSports,
  getAllSports,
};
