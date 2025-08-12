import { prisma } from "../../../../utils/prisma";

const userStat = async () => {
  const totalUsers = await prisma.user.count();
  const totalAthletes = await prisma.user.count({
    where: { profileRole: "ATHLETE" },
  });
  const totalClubs = await prisma.user.count({
    where: { profileRole: "CLUB" },
  });

  const totalIndividuals = await prisma.transactions.count({
    where: { earningType: "SUPPORT" },
  });

  const totalSponsors = await prisma.transactions.count({
    where: { earningType: "SPONSOR" },
  });

  return {
    totalUsers,
    totalAthletes,
    totalClubs,
    totalIndividuals,
    totalSponsors,
  };
};

const earningStat = async () => {
  const totalIndividualEarnings = await prisma.transactions.aggregate({
    where: { earningType: "SUPPORT" },
    _sum: {
      amount: true,
    },
  });
  const totalSponsorEarnings = await prisma.transactions.aggregate({
    where: { earningType: "SPONSOR" },
    _sum: {
      amount: true,
    },
  });
  const totalQuickEarnings = await prisma.transactions.aggregate({
    where: { earningType: "QUICKSUPPORT" },
    _sum: {
      amount: true,
    },
  });

  return {
    totalSponsorEarnings,
    totalIndividualEarnings,
    totalQuickEarnings,
  };
};

export const dashboardService = {
  userStat,
  earningStat,
};
