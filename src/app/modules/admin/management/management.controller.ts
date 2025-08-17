import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../../shared/catchAsync";
import sendResponse from "../../../middleware/sendResponse";
import { managementServices } from "./management.service";

const manageClubs = catchAsync(async (req, res) => {
  const result = await managementServices.manageClubs(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Posts retrieved successfully",
    data: result,
    success: true,
  });
});

const manageClubDetails = catchAsync(async (req, res) => {
  const { clubUserId } = req.params;
  const result = await managementServices.manageClubDetails(clubUserId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Club details retrieved successfully",
    data: result,
    success: true,
  });
});

const manageClubPostDetails = catchAsync(async (req, res) => {
  const { clubUserId } = req.params;
  const result = await managementServices.manageClubPostDetails(clubUserId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Club post details retrieved successfully",
    data: result,
    success: true,
  });
});

const deletePost = catchAsync(async (req, res) => {
  const { postId } = req.params;
  const result = await managementServices.deletePost(postId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Post deleted successfully",
    data: result,
    success: true,
  });
});

const manageSupporterSponsors = catchAsync(async (req, res) => {
  const result = await managementServices.manageSupporterSponsors(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Supporters and sponsors retrieved successfully",
    data: result,
    success: true,
  });
});

export const managementControllers = {
  manageClubs,
  manageClubDetails,
  manageClubPostDetails,
  manageSupporterSponsors,
  deletePost,
};
