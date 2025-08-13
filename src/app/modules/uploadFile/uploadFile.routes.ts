import { Router } from "express";
import { fileUploader } from "../../helper/uploadFile";
import { parseBodyMiddleware } from "../../middleware/parseBodyData";
import { uploadFileController } from "./uploadFile.controller";
import auth from "../../middleware/auth";
import { Role } from "@prisma/client";

const router = Router();

router.post(
  "/upload-images",
  auth(Role.USER, Role.ADMIN),
  fileUploader.uploadUniversal,
  parseBodyMiddleware,
  uploadFileController.uploadImages
);

export const uploadFileRoutes = router;
