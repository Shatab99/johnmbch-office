import { User } from "@prisma/client";
import ApiError from "../../error/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { compare, hash } from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import { OTPFn } from "../../helper/OTPFn";
import OTPVerify from "../../helper/OTPVerify";
import { getImageUrl, getImageUrls } from "../../helper/uploadFile";
import { prisma } from "../../../utils/prisma";
import { jwtHelpers } from "../../helper/jwtHelper";

const createUserIntoDB = async (payload: User) => {
  const findUser = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });
  if (findUser && findUser?.isVerified) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User already exists");
  }
  if (findUser && !findUser?.isVerified) {
    await OTPFn(payload.email);
    return;
  }

  const newPass = await hash(payload.password, 10);

  const result = await prisma.user.create({
    data: {
      ...payload,
      password: newPass,
    },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await prisma.athleteInfo.create({
    data: { userId: result.id },
  });

  await prisma.clubInfo.create({
    data: { userId: result.id },
  });

  await prisma.brandInfo.create({
    data: { userId: result.id },
  });

  OTPFn(payload.email);
  return result;
};

const changePasswordIntoDB = async (id: string, payload: any) => {
  const findUser = await prisma.user.findUnique({
    where: {
      id,
    },
  });
  if (!findUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  const comparePassword = await compare(payload.oldPassword, findUser.password);
  if (!comparePassword) {
    throw new ApiError(
      StatusCodes.NON_AUTHORITATIVE_INFORMATION,
      "Invalid password"
    );
  }

  const hashedPassword = await hash(payload.newPassword, 10);
  const result = await prisma.user.update({
    where: {
      id,
    },
    data: {
      password: hashedPassword,
    },
  });
  return result;
};

// user updates base on user profileRole

const updateAtheleteProfile = async (id: string, body: any, image: any) => {
  const profileImage = image?.profileImage?.[0]
    ? await getImageUrl(image.profileImage[0])
    : undefined;

  const passportOrNidImg = image?.passportOrNidImg?.[0]
    ? await getImageUrl(image.passportOrNidImg[0])
    : undefined;

  const selfieImage = image?.selfieImg?.[0]
    ? await getImageUrl(image.selfieImg[0])
    : undefined;

  const { profileRole, ...data } = body;

  const findUser = await prisma.user.findUnique({ where: { id } });
  if (!findUser) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  await prisma.user.update({
    where: { id },
    data: { profileRole: "ATHLETE" },
  });

  const result = await prisma.athleteInfo.update({
    where: { userId: id },
    data: {
      ...data,
      profileImage,
      passportOrNidImg,
      selfieImage,
    },
  });

  return result;
};

const updateClubProfile = async (id: string, body: any, image: any) => {
  const logoImage = image ? getImageUrl(image) : undefined;
  const { profileRole, ...data } = body;
  const findUser = await prisma.user.findUnique({
    where: {
      id,
    },
  });
  if (!findUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  await prisma.user.update({
    where: { id },
    data: { profileRole: "CLUB" },
  });
  const result = await prisma.clubInfo.update({
    where: {
      userId: id,
    },
    data: {
      ...data,
      logoImage: logoImage ?? undefined,
    },
  });

  return result;
};

const updateBrandProfile = async (id: string, body: any, image: any) => {
  const logoImage = image ? getImageUrl(image) : undefined;
  const { profileRole, ...data } = body;
  const findUser = await prisma.user.findUnique({
    where: {
      id,
    },
  });
  if (!findUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  await prisma.user.update({
    where: { id },
    data: { profileRole: "BRAND" },
  });
  const result = await prisma.brandInfo.update({
    where: {
      userId: id,
    },
    data: {
      ...data,
      logoImage: logoImage ?? undefined,
    },
  });

  return result;
};

const updateUserIntoDB = async (id: string, body: any, image: any) => {
  const findUser = await prisma.user.findUnique({
    where: {
      id,
    },
  });
  if (!findUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  if (body.profileRole === "ATHLETE") {
    return updateAtheleteProfile(id, body, image);
  } else if (body.profileRole === "CLUB") {
    return updateClubProfile(id, body, image);
  } else if (body.profileRole === "BRAND") {
    return updateBrandProfile(id, body, image);
  } else {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid profile role");
  }
};
const getMyProfile = async (id: string) => {
  const result = await prisma.user.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return result;
};

export const userServices = {
  createUserIntoDB,
  changePasswordIntoDB,
  getMyProfile,
  updateUserIntoDB,
};
