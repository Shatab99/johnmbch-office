import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../middleware/sendResponse";
import { Request, Response } from "express";
import { sponsorService } from "./sponsor.service";

const getSponsorsProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await sponsorService.getSponsorsProfile(
    req.user.id,
    req.query.role as string
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Sponsors retrieved successfully",
    data: result,
    success: true,
  });
});

const getClubAthleteSponsors = catchAsync(
  async (req: Request, res: Response) => {
    const result = await sponsorService.getClubAthleteSponsors(req.user.id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      message: "Club athlete sponsors retrieved successfully",
      data: result,
      success: true,
    });
  }
);

const getSponsorSupporterFavourite = catchAsync(
  async (req: Request, res: Response) => {
    const result = await sponsorService.getSponsorSupporterFavourite(
      req.user.id
    );
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      message: "Sponsor supporter favourites retrieved successfully",
      data: result,
      success: true,
    });
  }
);

export const sponsorController = {
  getSponsorsProfile,
  getClubAthleteSponsors,
  getSponsorSupporterFavourite,
};
