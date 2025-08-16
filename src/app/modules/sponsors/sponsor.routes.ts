import { Router } from "express";
import auth from "../../middleware/auth";
import { Role } from "@prisma/client";
import { sponsorController } from "./sponsor.controller";

const router = Router();

// router.get(
//   "/sponsors-supporter-profile",
//   auth(Role.USER),
//   sponsorController.getSponsorsProfile
// );

router.get(
  "/get-sponsors-supporter",
  auth(Role.USER),
  sponsorController.getClubAthleteSponsors
);
router.get(
  "/get-sponsor-supporter-favourite",
  auth(Role.USER),
  sponsorController.getSponsorSupporterFavourite
);

export const sponsorRoutes = router;
