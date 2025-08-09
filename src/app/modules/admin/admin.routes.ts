import { Router } from "express";
import { adminController } from "./admin.controller";
import auth from "../../middleware/auth";
import { Role } from "@prisma/client";
import validateRequest from "../../middleware/validateRequest";
import { adminValidation } from "./admin.validation";

const router = Router();

router.post(
  "/create-tier",
  auth(Role.ADMIN),
  validateRequest(adminValidation.createTier),
  adminController.createTier
);

router.get("/get-all-tiers", auth(Role.ADMIN), adminController.getAllTiers);

export const adminRoutes = router;
