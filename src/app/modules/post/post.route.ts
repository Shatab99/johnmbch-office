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

export const postRoutes = router;
