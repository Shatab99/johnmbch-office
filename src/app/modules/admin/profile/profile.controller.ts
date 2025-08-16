import catchAsync from "../../../../shared/catchAsync";
import sendResponse from "../../../middleware/sendResponse";
import { profileServices } from "./profile.service";

const updateProfileAdmin = catchAsync(async (req, res) => {
  const files = req.files as Express.MulterS3.File[];
  const id = req.user.id;
  const result = await profileServices.updateProfile(req.body, files, id);
  sendResponse(res, {
    statusCode: 200,
    data: result,
    success: true,
    message: "Profile updated successfully",
  });
});

const getAdminProfile = catchAsync(async (req, res) => {
  const id = req.user.id;
  const result = await profileServices.getAdminProfile(id);
  sendResponse(res, {
    statusCode: 200,
    data: result,
    success: true,
    message: "Admin profile retrieved successfully",
  });
});

export const profileController = {
  updateProfileAdmin,
  getAdminProfile,
};
