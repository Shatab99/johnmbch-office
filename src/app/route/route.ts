import { Router } from "express";
import { userRoutes } from "../modules/user/user.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { postRoutes } from "../modules/post/post.route";
import { chatRoutes } from "../modules/chat/chat.route";
import { adminRoutes } from "../modules/admin/admin.routes";
import { paymentRoutes } from "../modules/payment/payment.routes";
import { sponsorRoutes } from "../modules/sponsors/sponsor.routes";
import { uploadFileRoutes } from "../modules/uploadFile/uploadFile.routes";
import { NotificationsRouters } from "../modules/notifications/notification.routes";
// import { foodRoutes } from "../modules/foods/foods.Routes"
// import { locationRoutes } from "../modules/location/location.Routes"

const router = Router();
const routes = [
  {
    path: "/user",
    component: userRoutes,
  },
  {
    path: "/auth",
    component: authRoutes,
  },
  {
    path: "/post",
    component: postRoutes,
  },
  {
    path: "/chat",
    component: chatRoutes,
  },
  {
    path: "/admin",
    component: adminRoutes,
  },
  {
    path: "/payment",
    component: paymentRoutes,
  },
  {
    path: "/sponsors",
    component: sponsorRoutes,
  },
  {
    path: "/upload",
    component: uploadFileRoutes,
  },
  {
    path: "/notifications",
    component: NotificationsRouters,
  },
];

routes.forEach((route) => router.use(route.path, route.component));
export default router;
