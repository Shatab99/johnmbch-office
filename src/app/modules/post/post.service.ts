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
  if (!user.profileRole)
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Please update your profile first !"
    );

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

const getAllPostsFromDb = async (query: any) => {
  const posts = await dynamicQueryBuilder({
    model: prisma.post,
    query,
    searchableFields: [
      "ClubInfo.clubName",
      "ClubInfo.sportName",
      "AthleteInfo.fullName",
      "AthleteInfo.sportName",
    ],
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

  return { metadata: posts.meta, result };
};

// get profile details and
const getProfileDetailsFromDb = async (
  profileId: string,
  userId: string,
  query: any
) => {
  const { showSponsoredPosts } = query;
  const posts = await dynamicQueryBuilder({
    model: prisma.post,
    query,
    searchableFields: [
      "ClubInfo.clubName",
      "ClubInfo.sportName",
      "AthleteInfo.fullName",
      "AthleteInfo.sportName",
    ],
    forcedFilters: {
      OR: [{ athleteInfoId: profileId }, { clubInfoId: profileId }],
    },
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

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { AthleteInfo: true, ClubInfo: true },
  });

  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  const athleteInfo = user.AthleteInfo;
  const clubInfo = user.ClubInfo;

  const profile = {
    profileId: athleteInfo?.id || clubInfo?.id,
    profileRole: user?.profileRole,
    fullName: athleteInfo?.fullName || clubInfo?.clubName,
    profileImage: athleteInfo?.profileImage || clubInfo?.logoImage,
    sportName: athleteInfo?.sportName || clubInfo?.sportName,
    coverImage: user?.coverImage,
    isOwner: userId === athleteInfo?.userId || userId === clubInfo?.userId,
  };

  const result = posts.data.map((post: any) => {
    const {
      AthleteInfo,
      ClubInfo,
      userDetails,
      athleteInfoId,
      clubInfoId,
      ...restData
    } = post;
    return restData;
  });

  if (showSponsoredPosts === "true") {
    // tomorrow I will implement the logic to retrieve sponsored posts 
  }

  return { profile, metaData: posts.meta, posts: result };
};

// const getMyPosts

const getMyPosts = async (userId: string, query: any) => {
  const posts = await dynamicQueryBuilder({
    model: prisma.post,
    query,
    forcedFilters: { userId },
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

  // if (!posts || posts.data.length === 0) {
  //   throw new ApiError(StatusCodes.NOT_FOUND, "No posts found");
  // }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { AthleteInfo: true, ClubInfo: true },
  });

  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  const result = posts.data.map((post: any) => {
    const {
      AthleteInfo,
      ClubInfo,
      userDetails,
      athleteInfoId,
      clubInfoId,
      ...restData
    } = post;
    return restData;
  });

  const athleteInfo = user.AthleteInfo;
  const clubInfo = user.ClubInfo;

  const profile = {
    profileId: user?.AthleteInfo?.id || user?.ClubInfo?.id,
    profileRole: user?.profileRole,
    fullName: user?.AthleteInfo?.fullName || user?.ClubInfo?.clubName,
    profileImage: user?.AthleteInfo?.profileImage || user?.ClubInfo?.logoImage,
    sportName: user?.AthleteInfo?.sportName || user?.ClubInfo?.sportName,
    coverImage: user?.coverImage,
    isOwner: userId === athleteInfo?.userId || userId === clubInfo?.userId,
  };

  return { profile, metadata: posts.meta, posts: result };
};

export const postService = {
  createPostInDb,
  getAllPostsFromDb,
  getProfileDetailsFromDb,
  getMyPosts,
};
