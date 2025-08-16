import { prisma } from "../../../../utils/prisma";
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

const userStat = async () => {
  const totalUsers = await prisma.user.count();
  const totalAthletes = await prisma.user.count({
    where: { profileRole: "ATHLETE" },
  });
  const totalClubs = await prisma.user.count({
    where: { profileRole: "CLUB" },
  });

  const totalIndividuals = await prisma.user.count({
    where: { profileRole: "INDIVIDUAL" },
  });
  const totalSponsors = await prisma.user.count({
    where: { profileRole: "BRAND" },
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
    _sum: { amount: true },
  });

  const totalSponsorEarnings = await prisma.transactions.aggregate({
    where: { earningType: "SPONSOR" },
    _sum: { amount: true },
  });

  const totalQuickEarnings = await prisma.transactions.aggregate({
    where: { earningType: "QUICKSUPPORT" },
    _sum: { amount: true },
  });

  return {
    totalIndividualEarnings: (totalIndividualEarnings._sum.amount || 0) * 0.1,
    totalSponsorEarnings: (totalSponsorEarnings._sum.amount || 0) * 0.1,
    totalQuickEarnings: (totalQuickEarnings._sum.amount || 0) * 0.1,
  };
};


const getMonthlyRevenueGraph = async (year: number) => {
  // Get the date range for the whole year
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 11, 31));

  // Total revenue for current year
  const totalRevenue = await prisma.transactions.aggregate({
    _sum: {
      amount: true,
    },
    where: {
      createdAt: {
        gte: yearStart,
        lt: yearEnd,
      },
    },
  });

  // New supporters this year
  const newSupporter = await prisma.brandInfo.count({
    where: {
      createdAt: {
        gte: yearStart,
        lt: yearEnd,
      },
    },
  });

  // New brands this year
  const newBrand = await prisma.brandInfo.count({
    where: {
      createdAt: {
        gte: yearStart,
        lt: yearEnd,
      },
    },
  });

  // Fetch all transactions for that year
  const transactions = await prisma.transactions.findMany({
    where: {
      createdAt: {
        gte: yearStart,
        lte: yearEnd,
      },
    },
    select: {
      amount: true,
      earningType: true,
      createdAt: true,
    },
  });

  // Initialize graph data
  const graph = Array.from({ length: 12 }, (_, i) => ({
    month: new Date(0, i).toLocaleString("default", { month: "short" }),
    sponsor: 0,
    individual: 0,
    quickSupport: 0,
  }));

  // Populate monthly totals
  transactions.forEach((tx) => {
    const monthIndex = tx.createdAt.getMonth();
    if (tx.earningType === "SPONSOR") {
      graph[monthIndex].sponsor += tx.amount * 0.1;
    } else if (tx.earningType === "SUPPORT") {
      graph[monthIndex].individual += tx.amount * 0.1;
    } else {
      graph[monthIndex].quickSupport += tx.amount * 0.1;
    }
  });

  // Calculate current month revenue
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());

  const currentMonthRevenue = transactions
    .filter(
      (tx) =>
        tx.createdAt >= currentMonthStart && tx.createdAt <= currentMonthEnd
    )
    .reduce((sum, tx) => sum + tx.amount, 0);

  return {
    totalRevenue: (totalRevenue._sum.amount || 0) * 0.1,
    newSupporter,
    newBrand,
    // currentMonthRevenue,
    graph,
  };
};

export const dashboardService = {
  userStat,
  earningStat,
  getMonthlyRevenueGraph,
};
