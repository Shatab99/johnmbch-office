import { Request, Router } from "express";
import validateRequest from "../../middleware/validateRequest";
import { userController } from "./user.controller";
import { UserValidation } from "./user.validation";
import auth from "../../middleware/auth";
import { ProfileRole, Role } from "@prisma/client";
import { fileUploader } from "../../helper/uploadFile";
import { parseBodyMiddleware } from "../../middleware/parseBodyData";

const route = Router();

route.post(
  "/create",
  validateRequest(UserValidation.createValidation),
  userController.createUserController
);

route.put(
  "/change-password",
  auth(Role.USER || Role.ADMIN),
  validateRequest(UserValidation.changePasswordValidation),
  userController.changePasswordController
);

route.put(
  "/me",
  auth(Role.USER || Role.ADMIN),
  fileUploader.uploadUniversal,
  parseBodyMiddleware,
  userController.updateUserController
);
route.get("/me", auth(), userController.getMyProfileController);
route.put(
  "/update-cover-image",
  auth(Role.USER),
  fileUploader.uploadUniversal,
  userController.updateCoverImageController
);

route.post(
  "/send-code-before-update",
  auth(Role.USER || Role.ADMIN),
  userController.sendCodeBeforeUpdate
);

route.get("/sports", auth(Role.USER), userController.getSports);

route.post(
  "/connect-stripe-account",
  auth(Role.USER),
  userController.connectStripeAccount
);

export const userRoutes = route;
