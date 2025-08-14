import catchAsync from "../../../../shared/catchAsync";
import sendResponse from "../../../middleware/sendResponse";
import { dashboardService } from "./dashboard.service";

const userStat = catchAsync(async (req, res) => {
  const result = await dashboardService.userStat();
  sendResponse(res, {
    statusCode: 200,
    data: result,
    success: true,
    message: "User statistics fetched successfully",
  });
});

const earningStat = catchAsync(async (req, res) => {
  const result = await dashboardService.earningStat();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Earning statistics fetched successfully",
    data: result,
  });
});

const revenueStat = catchAsync(async (req, res) => {
  const result = await dashboardService.revenueStat();
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Revenue statistics fetched successfully",
    data: result,
  });
});

const getMonthlyRevenueGraph = catchAsync(async (req, res) => {
  const year = Number(req.params.year);
  const result = await dashboardService.getMonthlyRevenueGraph(year);
  sendResponse(res, {
    statusCode: 200,
    data: result,
    success: true,
    message: "Monthly revenue graph fetched successfully",
  });
});

export const dashboardController = {
  userStat,
  earningStat,
  getMonthlyRevenueGraph,
  revenueStat,
};
