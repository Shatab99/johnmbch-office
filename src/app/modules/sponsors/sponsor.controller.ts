import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../middleware/sendResponse";
import { Request, Response } from "express";
import { sponsorService } from "./sponsor.service";

const getAllSponsors = catchAsync(async (req: Request, res: Response) => {
  const result = await sponsorService.getAllSponsors();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Sponsors retrieved successfully",
    data: result,
    success: true,
  });
});

export const sponsorController = {
  getAllSponsors,
};
