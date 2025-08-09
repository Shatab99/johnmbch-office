import { Router } from "express";
import { userRoutes } from "../modules/user/user.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { postRoutes } from "../modules/post/post.route";
import { chatRoutes } from "../modules/chat/chat.route";
import { adminRoutes } from "../modules/admin/admin.routes";
import { paymentRoutes } from "../modules/payment/payment.routes";
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
];

routes.forEach((route) => router.use(route.path, route.component));
export default router;
