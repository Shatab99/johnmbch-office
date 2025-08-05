import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../utils/prisma";
import ApiError from "../../error/ApiErrors";
import { dynamicQueryBuilder } from "../../helper/queryBuilder";
import { getFileUrl } from "../../helper/uploadFile";

const createPostInDb = async (postData: any, files: any) => {
  const video = (await getFileUrl(files.video?.[0])) || null;
  const image = files.image?.[0]?.location || null;

  let profile: any;

  const user = await prisma.user.findUnique({ where: { id: postData.userId } });

  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  if (user.profileRole === "ATHLETE") {
    const athleteInfo = await prisma.athleteInfo.findUnique({
      where: { userId: postData.userId },
      select: {
        id: true,
      },
    });

    if (!athleteInfo)
      throw new ApiError(
        StatusCodes.NOT_FOUND,
        "Athlete information not found"
      );
    profile = {
      athleteInfoId: athleteInfo.id,
    };
  }

  if (user.profileRole === "CLUB") {
    const clubInfo = await prisma.clubInfo.findUnique({
      where: { userId: postData.userId },
      select: {
        id: true,
      },
    });

    if (!clubInfo)
      throw new ApiError(StatusCodes.NOT_FOUND, "Club information not found");
    profile = {
      clubInfoId: clubInfo.id,
    };
  }

  if (user.profileRole === "BRAND")
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Brand profile cannot create posts !"
    );

  await prisma.post.create({
    data: {
      ...postData,
      image,
      video,
      ...profile,
    },
  });

  return "Success";
};

export const getAllPostsFromDb = async (query: any) => {
  const posts = await dynamicQueryBuilder({
    model: prisma.post,
    query,
    searchableFields: ["content", "title"],
    includes: {
      AthleteInfo: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          sportName: true,
        },
      },
      ClubInfo: {
        select: {
          id: true,
          clubName: true,
          logoImage: true,
          sportName: true,
        },
      },
      userDetails: {
        select: {
          profileRole: true,
        },
      },
    },
  });

  const result = posts.data.map((post: any) => {
    const {
      AthleteInfo,
      ClubInfo,
      userDetails,
      athleteInfoId,
      clubInfoId,
      ...restData
    } = post;

    const profileData =
      userDetails.profileRole === "ATHLETE"
        ? {
            profileId: AthleteInfo?.id,
            fullName: AthleteInfo?.fullName,
            profileImage: AthleteInfo?.profileImage,
            sportName: AthleteInfo?.sportName,
          }
        : {
            profileId: ClubInfo?.id,
            clubName: ClubInfo?.clubName,
            logoImage: ClubInfo?.logoImage,
            sportName: ClubInfo?.sportName,
          };

    return {
      postData: restData,
      profileInfo: profileData,
    };
  });

  return result;
};

// get profile details
const getProfileDetailsFromDb = async (profileId: string, userId: string) => {
  const posts = await prisma.post.findFirst({
    where: {
      OR: [{ athleteInfoId: profileId }, { clubInfoId: profileId }],
    },
    include: {
      AthleteInfo: true,
      ClubInfo: true,
      userDetails: true,
    },
  });

  if (!posts) throw new ApiError(StatusCodes.NOT_FOUND, "Profile not found");

  const { AthleteInfo, ClubInfo, userDetails, ...restData } = posts;

  const user = await prisma.user.findUnique({
    where: { id: posts.userDetails.id },
  });

  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  const result = {
    ...restData,
    profileInfo:
      user?.profileRole === "ATHLETE" ? posts?.AthleteInfo : posts?.ClubInfo,
    isOwner:
      userId === posts?.AthleteInfo?.userId ||
      userId === posts?.ClubInfo?.userId,
  };

  return result;
};

// const getMyPosts

const getMyPosts = async (userId: string) => {
  const posts = await prisma.post.findMany({
    where: {
      userId,
    },
    include: {
      AthleteInfo: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
          sportName: true,
        },
      },
      ClubInfo: {
        select: {
          id: true,
          clubName: true,
          logoImage: true,
          sportName: true,
        },
      },
      userDetails: {
        select: {
          profileRole: true,
        },
      },
    },
  });

  if (!posts || posts.length === 0) {
    throw new ApiError(StatusCodes.NOT_FOUND, "No posts found");
  }

  const result = posts.map((post) => {
    const { AthleteInfo, ClubInfo, userDetails, ...restData } = post;

    const profileData =
      userDetails.profileRole === "ATHLETE"
        ? {
            profileId: AthleteInfo?.id,
            fullName: AthleteInfo?.fullName,
            profileImage: AthleteInfo?.profileImage,
            sportName: AthleteInfo?.sportName,
          }
        : {
            profileId: ClubInfo?.id,
            clubName: ClubInfo?.clubName,
            logoImage: ClubInfo?.logoImage,
            sportName: ClubInfo?.sportName,
          };

    return {
      postData: restData,
      profileInfo: profileData,
    };
  });

  return result;
};

export const postService = {
  createPostInDb,
  getAllPostsFromDb,
  getProfileDetailsFromDb,
  getMyPosts,
};
