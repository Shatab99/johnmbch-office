import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../middleware/sendResponse";
import { StatusCodes } from "http-status-codes";
import { postService } from "./post.service";
import { adminService } from "../admin/admin.service";

const createPost = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user;
  const body = req.body as any;
  const files = req.files as {
    [fieldname: string]: Express.MulterS3.File[];
  };
  const result = await postService.createPostInDb(
    { ...body, userId: id },
    files
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Post created successfully",
    data: result,
    success: true,
  });
});

const getAllPosts = catchAsync(async (req: Request, res: Response) => {
  const result = await postService.getAllPostsFromDb(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Posts retrieved successfully",
    data: result,
    success: true,
  });
});

const getProfileDetails = catchAsync(async (req: Request, res: Response) => {
  const { profile } = req.params;
  const { id } = req.user;
  const result = await postService.getProfileDetailsFromDb(
    profile,
    id,
    req.query
  );
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Profile details retrieved successfully",
    data: result,
    success: true,
  });
});

const getMyPosts = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user;
  const result = await postService.getMyPosts(id, req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "My posts retrieved successfully",
    data: result,
    success: true,
  });
});

const likePost = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { id } = req.user;
  const result = await postService.likePost(postId, id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Post liked successfully",
    data: result,
    success: true,
  });
});

const unlikePost = catchAsync(async (req: Request, res: Response) => {
  const { postId } = req.params;
  const { id } = req.user;
  const result = await postService.unlikePost(postId, id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Post unliked successfully",
    data: result,
    success: true,
  });
});

const searchProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await postService.searchProfile(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Profile search results retrieved successfully",
    data: result,
    success: true,
  });
});

export const postController = {
  createPost,
  getAllPosts,
  getMyPosts,
  searchProfile,
  likePost,
  unlikePost,
  getProfileDetails
};
