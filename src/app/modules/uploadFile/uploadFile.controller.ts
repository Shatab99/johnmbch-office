import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../middleware/sendResponse";
import { StatusCodes } from "http-status-codes";
import { getFileUrls } from "../../helper/uploadFile";
import ApiError from "../../error/ApiErrors";


const uploadImages = catchAsync(async (req: Request, res: Response) => {
  const files = req.files as {
    [fieldname: string]: Express.MulterS3.File[];
  };

  const images = files.images;

  const imageUrls = await getFileUrls(images);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "User updated successfully",
    data: imageUrls,
    success: true,
  });
});

export const uploadFileController = {
  uploadImages,
};
