import { NextFunction, Request, Response } from "express";
import { JwtPayload, Secret } from "jsonwebtoken";
import ApiError from "../error/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { jwtHelpers } from "../helper/jwtHelper";
import { prisma } from "../../utils/prisma";

const auth = (...roles: string[]) => {
  return async (
    req: Request & { user?: any },
    res: Response,
    next: NextFunction
  ) => {
    try {
      const token = req.headers.authorization;

      if (!token || !token.startsWith("Bearer ")) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "You are not authorized!");
      }
      const accessToken = token.split("Bearer ")[1];

      const verifiedUser = jwtHelpers.verifyToken(accessToken) as JwtPayload;

      const user = await prisma.user.findUnique({
        where: { id: verifiedUser.id },
      });

      if (!user) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid token");
      }

      if (!user.isVerified) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid token");
      }

      req.user = verifiedUser;

      if (roles.length && !roles.includes(verifiedUser.role)) {
        throw new ApiError(
          StatusCodes.FORBIDDEN,
          "Forbidden, You are not authorized!"
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
};

export default auth;
