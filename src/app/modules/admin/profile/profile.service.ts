import { prisma } from "../../../../utils/prisma";
import bcrypt from "bcrypt";
import ApiError from "../../../error/ApiErrors";
import { StatusCodes } from "http-status-codes";

const updateProfile = async (data: any, files: any, id: string) => {
  const logo = files.logo ? files.logo[0].location : undefined;
  const adminImage = files.adminImage
    ? files.adminImage[0].location
    : undefined;

  const adminProfile = await prisma.adminProfile.findFirst({});

  const existingLogo = adminProfile?.logo;
  const existingAdminImage = adminProfile?.adminImage;

  const admin = await prisma.user.findUnique({
    where: { id, role: "ADMIN" },
  });

  if (!admin) throw new ApiError(StatusCodes.NOT_FOUND, "Admin not found");

  const { email, password } = admin;

  if (data.newPassword) {
    const isPasswordCorrect = await bcrypt.compare(data.newPassword, password);
    if (!isPasswordCorrect)
      throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid password");
  }

  adminProfile
    ? await prisma.adminProfile.update({
        where: { id: adminProfile.id },
        data: {
          name: data.name ?? adminProfile?.name,
          logo: logo ?? existingLogo,
          adminImage: adminImage ?? existingAdminImage,
          updatedAt: new Date(),
        },
      })
    : await prisma.adminProfile.create({
        data: {
          name: data.name,
          logo,
          adminImage,
        },
      });

  await prisma.user.update({
    where: { id },
    data: {
      email: data.email ?? email,
      password: data.newPassword
        ? await bcrypt.hash(data.newPassword, 10)
        : password,
      updatedAt: new Date(),
    },
  });

  return "success";
};

const getAdminProfile = async (adminId: string) => {
  const adminProfile = await prisma.adminProfile.findFirst({});
  const userAdmin = await prisma.user.findUnique({ where: { id: adminId } });
  const result = {
    name: adminProfile?.name || null,
    profileImage: adminProfile?.adminImage || null,
    logo: adminProfile?.logo || null,
    email: userAdmin?.email,
  };

  return result;
};

export const profileServices = {
  updateProfile,
  getAdminProfile,
};
