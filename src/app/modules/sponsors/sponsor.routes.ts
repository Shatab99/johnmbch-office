import { Router } from "express";
import auth from "../../middleware/auth";
import { Role } from "@prisma/client";
import { sponsorController } from "./sponsor.controller";

const router = Router();

router.get("/sponsors-supporter-profile", auth(Role.USER), sponsorController.getSponsorsProfile);

export const sponsorRoutes = router;
