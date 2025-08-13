import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { userServices } from "./user.service";
import sendResponse from "../../middleware/sendResponse";
import { StatusCodes } from "http-status-codes";
import validateRequest from "../../middleware/validateRequest";
import { UserValidation } from "./user.validation";
import ApiError from "../../error/ApiErrors";
import { adminService } from "../admin/admin.service";

const createUserController = catchAsync(async (req: Request, res: Response) => {
  const body = req.body;
  const result = await userServices.createUserIntoDB(body);
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    message: "Please check your email for verification",
    data: result,
    success: true,
  });
});

const changePasswordController = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.user;
    const body = req.body as any;
    const result = await userServices.changePasswordIntoDB(id, body);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      message: "User updated successfully",
      data: result,
      success: true,
    });
  }
);

const updateUserController = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user;
  const body = req.body as any;
  const files = req.files as {
    [fieldname: string]: Express.MulterS3.File[];
  };

  // Validate request based on role (optional if already done in middleware)
  const role = body.profileRole;

  // Extract uploaded images based on role
  let images: Record<string, string | undefined> = {};

  if (role === "ATHLETE") {
    images = {
      profileImage: files.profileImage?.[0]?.location,
      passportOrNidImg: files.passportOrNidImg?.[0]?.location,
      selfieImg: files.selfieImg?.[0]?.location,
    };
  } else if (role === "CLUB") {
    images = {
      logoImage: files.logoImage?.[0]?.location,
      licenseImage: files.licenseImage?.[0]?.location,
      certificateImage: files.certificateImage?.[0]?.location,
    };
  } else if (role === "BRAND") {
    images = {
      logoImage: files.logoImage?.[0]?.location,
    };
  } else if (role === "INDIVIDUAL") {
    images = {
      profileImage: files.profileImage?.[0]?.location,
    };
  } else {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid profile role");
  }

  
  if (role === "ATHLETE")
    validateRequest(UserValidation.updateAtheleteProfileValidation);
  else if (role === "CLUB")
    validateRequest(UserValidation.updateClubProfileValidation);
  else if (role === "BRAND")
    validateRequest(UserValidation.updatebrandProfileValidation);
  else if (role === "INDIVIDUAL")
    validateRequest(UserValidation.updateIndividualProfileValidation);

  const result = await userServices.updateUserIntoDB(id, body, images);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "User updated successfully",
    data: result,
    success: true,
  });
});

const sendCodeBeforeUpdate = catchAsync(async (req: Request, res: Response) => {
  const { email, id } = req.user;
  const result = await userServices.sendCodeBeforeUpdate(id, email);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Verification code sent successfully",
    data: result,
    success: true,
  });
});

const getMyProfileController = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.user;
    const result = await userServices.getMyProfile(id);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      message: "User profile retrieved successfully",
      data: result,
      success: true,
    });
  }
);

const updateCoverImageController = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.user;
    const files = req.files as {
      [fieldname: string]: Express.MulterS3.File[];
    };

    if (!files.coverImage || files.coverImage.length === 0) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Cover image is required");
    }

    const coverImageUrl = files.coverImage[0].location;

    const result = await userServices.updateCoverImage(id, coverImageUrl);
    sendResponse(res, {
      statusCode: StatusCodes.OK,
      message: "Cover image updated successfully",
      data: result,
      success: true,
    });
  }
);

const getSports = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getAllSports();
  const formattedResult = result.map((sport) => sport.name);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Sports retrieved successfully",
    data: formattedResult,
    success: true,
  });
});

export const userController = {
  createUserController,
  updateUserController,
  changePasswordController,
  getMyProfileController,
  sendCodeBeforeUpdate,
  updateCoverImageController,
  getSports,
};
