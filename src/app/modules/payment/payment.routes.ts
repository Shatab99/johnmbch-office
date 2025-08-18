import { Router } from "express";
import auth from "../../middleware/auth";
import { Role } from "@prisma/client";
import { paymentController } from "./payment.controller";
import validateRequest from "../../middleware/validateRequest";
import { PaymentValidation } from "./payment.validation";
import { fileUploader } from "../../helper/uploadFile";
import { parseBodyMiddleware } from "../../middleware/parseBodyData";

const route = Router();

route.get("/get-tiers", auth(Role.USER), paymentController.getTiersController);

// // route.post('/create', auth(Role.USER), paymentController.createPaymentController)
// route.post("/save-card", auth(Role.USER), paymentController.saveCardController);
// route.get(
//   "/get-card",
//   auth(Role.USER),
//   paymentController.getSaveCardController
// );
// route.delete(
//   "/delete-card",
//   auth(Role.USER),
//   paymentController.deleteCardController
// );

route.post(
  "/join-tier",
  auth(Role.USER),
  fileUploader.uploadUniversal,
  parseBodyMiddleware,
  validateRequest(PaymentValidation.joinTierValidation),
  paymentController.joinTierController
);

route.post(
  "/quick-support",
  auth(Role.USER),
  validateRequest(PaymentValidation.quickSupportValidation),
  paymentController.quickSupport
);

route.post(
  "/cancel-subscription/:recipientId",
  auth(Role.USER),
  paymentController.cancelSubscription
);

export const paymentRoutes = route;
