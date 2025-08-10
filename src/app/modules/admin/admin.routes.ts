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
router.delete("/delete-tier/:id", auth(Role.ADMIN), adminController.deleteTier);
router.put(
  "/edit-tier/:id",
  auth(Role.ADMIN),
  validateRequest(adminValidation.editTier),
  adminController.editATier
);

//sports  sections

router.get("/get-all-sports", auth(Role.ADMIN), adminController.getAllSports);
router.post(
  "/add-sports",
  auth(Role.ADMIN),
  validateRequest(adminValidation.addSports),
  adminController.addSports
);
router.delete(
  "/delete-sports/:id",
  auth(Role.ADMIN),
  adminController.deleteSports
);

export const adminRoutes = router;
