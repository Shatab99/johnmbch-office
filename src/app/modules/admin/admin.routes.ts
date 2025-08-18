import { Router } from "express";
import { adminController } from "./admin.controller";
import auth from "../../middleware/auth";
import { Role } from "@prisma/client";
import validateRequest from "../../middleware/validateRequest";
import { adminValidation } from "./admin.validation";
import { dashboardController } from "./dashboard/dashboard.controller";
import { profileController } from "./profile/profile.controller";
import { fileUploader } from "../../helper/uploadFile";
import { parseBodyMiddleware } from "../../middleware/parseBodyData";
import { profileValidation } from "./profile/profile.validation";
import { managementControllers } from "./management/management.controller";

const router = Router();

router.post(
  "/create-tier",
  auth(Role.ADMIN),
  validateRequest(adminValidation.createTier),
  adminController.createTier
);

router.get("/get-all-tiers", auth(Role.ADMIN), adminController.getAllTiers);
router.get(
  "/get-tier-details/:id",
  auth(Role.ADMIN),
  adminController.tierDetails
);

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

//--------------------------Analytics Part -----------------------------

router.get(
  "/dashboard/user-stat",
  auth(Role.ADMIN),
  dashboardController.userStat
);

router.get(
  "/dashboard/earning-stat",
  auth(Role.ADMIN),
  dashboardController.earningStat
);

router.get(
  "/dashboard/monthly-revenue-graph/:year",
  auth(Role.ADMIN),
  dashboardController.getMonthlyRevenueGraph
);

//----------------------- Get admin profile ----------------------------

router.get(
  "/profile/get-profile",
  auth(Role.ADMIN),
  profileController.getAdminProfile
);

router.put(
  "/profile/update",
  auth(Role.ADMIN),
  fileUploader.uploadUniversal,
  parseBodyMiddleware,
  validateRequest(profileValidation.updateProfileSchema),
  profileController.updateProfileAdmin
);

//--------------- Management --------------------

router.get(
  "/management/get-clubs",
  auth(Role.ADMIN),
  managementControllers.manageClubs
);

router.get(
  "/management/get-club-details/:clubUserId",
  auth(Role.ADMIN),
  managementControllers.manageClubDetails
);

router.get(
  "/management/get-club-post-details/:clubUserId",
  auth(Role.ADMIN),
  managementControllers.manageClubPostDetails
);

router.get(
  "/management/get-supporter-sponsors",
  auth(Role.ADMIN),
  managementControllers.manageSupporterSponsors
);

router.delete(
  "/management/delete-post/:postId",
  auth(Role.ADMIN),
  managementControllers.deletePost
);

router.put(
  "/change-status/:userId",
  validateRequest(adminValidation.changeStatus),
  auth(Role.ADMIN),
  managementControllers.changeStatus
);

router.get(
  "/management/manage-supporter-sponsors/:userId",
  auth(Role.ADMIN),
  managementControllers.manageSupporterSponsorsDetails
);

//-------------------notifications-------------

router.get(
  "/get-notifications",
  auth(Role.ADMIN),
  adminController.getAllNotifications
);

export const adminRoutes = router;
