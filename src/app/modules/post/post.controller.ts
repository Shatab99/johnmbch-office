import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../middleware/sendResponse";
import { StatusCodes } from "http-status-codes";
import { postService } from "./post.service";

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
  const result = await postService.getProfileDetailsFromDb(profile, id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "Profile details retrieved successfully",
    data: result,
    success: true,
  });
});

const getMyPosts = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.user;
  const result = await postService.getMyPosts(id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    message: "My posts retrieved successfully",
    data: result,
    success: true,
  });
});

export const postController = {
  createPost,
  getAllPosts,
  getMyPosts,
  getProfileDetails,
};
