import catchAsync from "../../../../shared/catchAsync";
import sendResponse from "../../../middleware/sendResponse";

const userStat = catchAsync(async (req, res) => {
  const result = "working";
  sendResponse(res, {
    statusCode: 200,
    data: result,
    success: true,
    message: "Sports added successfully",
  });
});

export const dashboardController = {
  userStat,
};
