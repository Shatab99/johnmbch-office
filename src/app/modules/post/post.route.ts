import { Router } from "express";
import { postController } from "./post.controller";
import auth from "../../middleware/auth";
import { Role } from "@prisma/client";
import { fileUploader } from "../../helper/uploadFile";
import { parseBodyMiddleware } from "../../middleware/parseBodyData";
import validateRequest from "../../middleware/validateRequest";
import { PostValidation } from "./post.validation";

const router = Router();

router.post(
  "/create-post",
  auth(Role.USER),
  fileUploader.uploadUniversal,
  parseBodyMiddleware,
  validateRequest(PostValidation.createPostValidation),
  postController.createPost
);

router.get(
  "/profile-details/:profile",
  auth(Role.USER),
  postController.getProfileDetails
);
router.get("/all-posts", auth(Role.USER), postController.getAllPosts);

router.get("/my-posts", auth(Role.USER), postController.getMyPosts);

router.post("/like-post/:postId", auth(Role.USER), postController.likePost);
router.post("/unlike-post/:postId", auth(Role.USER), postController.unlikePost);
router.get("/search-profile", auth(Role.USER), postController.searchProfile);

router.delete(
  "/delete-post/:postId",
  auth(Role.USER),
  postController.deletePost
);

router.put(
  "/edit-post/:postId",
  fileUploader.uploadUniversal,
  auth(Role.USER),
  parseBodyMiddleware,
  validateRequest(PostValidation.createPostValidation),
  postController.editPost
);

export const postRoutes = router;
