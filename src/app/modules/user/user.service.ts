import { User } from "@prisma/client";
import ApiError from "../../error/ApiErrors";
import { StatusCodes } from "http-status-codes";
import { compare, hash } from "bcrypt";
import { OTPFn } from "../../helper/OTPFn";
import OTPVerify from "../../helper/OTPVerify";
import { prisma } from "../../../utils/prisma";
import { createStripeConnectAccount } from "../../helper/createStripeConnectAccount";
import { stripe } from "../../../config/stripe";

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

  const athleteInfo = await prisma.athleteInfo.create({
    data: { userId: result.id },
  });

  const clubInfo = await prisma.clubInfo.create({
    data: { userId: result.id },
  });

  const brandInfo = await prisma.brandInfo.create({
    data: { userId: result.id },
  });

  const individualInfo = await prisma.individualInfo.create({
    data: { userId: result.id },
  });

  await prisma.user.update({
    where: { id: result.id },
    data: {
      athleteInfoId: athleteInfo.id,
      clubInfoId: clubInfo.id,
      brandInfoId: brandInfo.id,
      individualInfoId: individualInfo.id,
    },
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
  const profileImage = image.profileImage;

  const passportOrNidImg = image.passportOrNidImg;

  const selfieImage = image.selfieImg;

  const { profileRole, otp, ...data } = body;

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

  await createStripeConnectAccount(id);

  return {
    message:
      "Stripe email send to your email please check and complete the process",
    ...result,
  };
};

const updateClubProfile = async (id: string, body: any, image: any) => {
  const logoImage = image.logoImage;
  const licenseImage = image.licenseImage;
  const certificateImage = image.certificateImage;
  const { profileRole, otp, ...data } = body;
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
      licenseImage: licenseImage ?? undefined,
      certificateImage: certificateImage ?? undefined,
    },
  });

  await createStripeConnectAccount(id);

  return {
    message:
      "Stripe email send to your email please check and complete the process",
    ...result,
  };
};

const updateBrandProfile = async (id: string, body: any, image: any) => {
  const logoImage = image.logoImage;
  const { profileRole, otp, ...data } = body;
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

const updateIndividualProfile = async (id: string, body: any, image: any) => {
  const profileImage = image.profileImage;

  const { profileRole, otp, ...data } = body;

  const findUser = await prisma.user.findUnique({ where: { id } });
  if (!findUser) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  await prisma.user.update({
    where: { id },
    data: { profileRole: "INDIVIDUAL" },
  });

  const result = await prisma.individualInfo.update({
    where: { userId: id },
    data: {
      ...data,
      profileImage,
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

  // match the qr code

  // const { message } = await OTPVerify({
  //   otp: body.otp,
  //   email: findUser.email,
  //   time: "24h",
  // });

  // if (!message) throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid OTP code");

  // connect the stripe account

  if (body.profileRole === "ATHLETE") {
    return updateAtheleteProfile(id, body, image);
  } else if (body.profileRole === "CLUB") {
    return updateClubProfile(id, body, image);
  } else if (body.profileRole === "BRAND") {
    return updateBrandProfile(id, body, image);
  } else if (body.profileRole === "INDIVIDUAL") {
    return updateIndividualProfile(id, body, image);
  } else {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid profile role");
  }
};
const getMyProfile = async (id: string) => {
  const result = await prisma.user.findUnique({
    where: {
      id,
    },
    include: {
      AthleteInfo: true,
      ClubInfo: true,
      BrandInfo: true,
      IndividualInfo: true,
    },
  });

  if (!result) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  const profile = {
    name:
      result.profileRole === "ATHLETE"
        ? result.AthleteInfo?.fullName
        : result.profileRole === "CLUB"
        ? result.ClubInfo?.clubName
        : result.profileRole === "BRAND"
        ? result.BrandInfo?.brandName
        : result.profileRole === "INDIVIDUAL"
        ? result.IndividualInfo?.fullName
        : undefined,

    profileImage:
      result.profileRole === "ATHLETE"
        ? result.AthleteInfo?.profileImage
        : result.profileRole === "CLUB"
        ? result.ClubInfo?.logoImage
        : result.profileRole === "BRAND"
        ? result.BrandInfo?.logoImage
        : result.profileRole === "INDIVIDUAL"
        ? result.IndividualInfo?.profileImage
        : undefined,
    sportName:
      result.profileRole === "ATHLETE"
        ? result.AthleteInfo?.sportName
        : result.profileRole === "CLUB"
        ? result.ClubInfo?.sportName
        : result.profileRole === "BRAND"
        ? "Sponsor"
        : result.profileRole === "INDIVIDUAL"
        ? "Supporter"
        : undefined,
    bio:
      result.profileRole === "ATHLETE"
        ? result.AthleteInfo?.bio
        : result.profileRole === "CLUB"
        ? result.ClubInfo?.bio
        : null,
    club:
      result.profileRole === "ATHLETE"
        ? result.AthleteInfo?.clubName
        : result.profileRole === "CLUB"
        ? result.ClubInfo?.clubName
        : null,
    position:
      result.profileRole === "ATHLETE" ? result.AthleteInfo?.position : null,
    country:
      result.profileRole === "ATHLETE"
        ? result.AthleteInfo?.country
        : result.profileRole === "CLUB"
        ? result.ClubInfo?.country
        : result.profileRole === "BRAND"
        ? result.BrandInfo?.country
        : null,
    city:
      result.profileRole === "ATHLETE"
        ? result.AthleteInfo?.city
        : result.profileRole === "CLUB"
        ? result.ClubInfo?.city
        : result.profileRole === "BRAND"
        ? result.BrandInfo?.city
        : result.profileRole === "INDIVIDUAL"
        ? result.IndividualInfo?.city
        : null,
    nidPhoto:
      result.profileRole === "ATHLETE"
        ? result.AthleteInfo?.passportOrNidImg
        : null,
    selfiePhoto:
      result.profileRole === "ATHLETE" ? result.AthleteInfo?.selfieImage : null,
    lincensePhoto:
      result.profileRole === "CLUB" ? result.ClubInfo?.licenseImage : null,
    textCertificate:
      result.profileRole === "CLUB" ? result.ClubInfo?.certificateImage : null,
    isStripeConnected:
      result.profileRole === "BRAND" || result.profileRole === "INDIVIDUAL"
        ? null
        : result.connectAccountId
        ? true
        : false,
  };

  const shapedResult = {
    id: result.id,
    email: result.email,
    role: result.role,
    profileRole: result.profileRole,
    isProfileUpdated: result.profileRole ? true : false,
    profile,
  };

  return shapedResult;
};

const sendCodeBeforeUpdate = async (id: string, email: string) => {
  const findUser = await prisma.user.findUnique({
    where: {
      id,
    },
  });
  if (!findUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  if (findUser.email !== email) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Email does not match");
  }
  await OTPFn(email);
  return "otp sent successfully";
};

const updateCoverImage = async (userId: string, coverImageUrl: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      AthleteInfo: true,
      ClubInfo: true,
      BrandInfo: true,
    },
  });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { coverImage: coverImageUrl },
  });

  return "Cover image updated successfully";
};



export const userServices = {
  createUserIntoDB,
  changePasswordIntoDB,
  getMyProfile,
  sendCodeBeforeUpdate,
  updateUserIntoDB,
  updateCoverImage,
};
