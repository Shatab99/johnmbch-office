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
    forcedFilters: { isSponsored: false },
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
      likes: {
        select: {
          id: true,
          userId: true,
          postId: true,
          User: {
            select: {
              profileRole: true,
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
              BrandInfo: {
                select: {
                  id: true,
                  brandName: true,
                  logoImage: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const result = posts.data.map((post: any) => {
    const {
      id,
      AthleteInfo,
      ClubInfo,
      userDetails,
      athleteInfoId,
      clubInfoId,
      likes,
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

    const likesData = likes.map((like: any) => {
      const {
        id,
        userId,
        postId,
        User: { profileRole, AthleteInfo, ClubInfo, BrandInfo },
      } = like;

      const profileData =
        profileRole === "ATHLETE"
          ? {
              profileId: AthleteInfo?.id,
              fullName: AthleteInfo?.fullName,
              profileImage: AthleteInfo?.profileImage,
              sportName: AthleteInfo?.sportName,
            }
          : profileRole === "CLUB"
          ? {
              profileId: ClubInfo?.id,
              clubName: ClubInfo?.clubName,
              logoImage: ClubInfo?.logoImage,
              sportName: ClubInfo?.sportName,
            }
          : {
              profileId: BrandInfo?.id,
              brandName: BrandInfo?.brandName,
              logoImage: BrandInfo?.logoImage,
              sportName: BrandInfo?.sportName,
            };

      return {
        likeId: id,
        userId,
        postId,
        profileInfo: profileData,
      };
    });

    return {
      postData: { postId: post.id, ...restData, likes: likesData },
      profileInfo: profileData,
    };
  });

  return { metadata: posts.meta, result };
};

// get profile details and
const getProfileDetailsFromDb = async (
  profileUserId: string,
  userId: string,
  query: any
) => {
  const { showSponsoredPosts, ...restQuery } = query;

  const posts = await dynamicQueryBuilder({
    model: prisma.post,
    query: restQuery,
    searchableFields: [
      "ClubInfo.clubName",
      "ClubInfo.sportName",
      "AthleteInfo.fullName",
      "AthleteInfo.sportName",
    ],
    forcedFilters: {
      userId: profileUserId,
      isSponsored: showSponsoredPosts === "true" ? true : false,
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
      likes: {
        select: {
          id: true,
          userId: true,
          postId: true,
          User: {
            select: {
              profileRole: true,
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
              BrandInfo: {
                select: {
                  id: true,
                  brandName: true,
                  logoImage: true,
                },
              },
            },
          },
        },
      },
      BrandInfo: {
        select: {
          id: true,
          brandName: true,
          logoImage: true,
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
      id,
      AthleteInfo,
      ClubInfo,
      userDetails,
      athleteInfoId,
      clubInfoId,
      brandInfoId,
      BrandInfo,
      likes,
      ...postData
    } = post;

    const profileData =
      userDetails.profileRole === "ATHLETE"
        ? {
            profileId: AthleteInfo?.id,
            name: AthleteInfo?.fullName,
            profileImage: AthleteInfo?.profileImage,
            sportName: AthleteInfo?.sportName,
          }
        : {
            profileId: ClubInfo?.id,
            name: ClubInfo?.clubName,
            profileImage: ClubInfo?.logoImage,
            sportName: ClubInfo?.sportName,
          };

    const likesData = likes.map((like: any) => {
      const {
        id,
        userId,
        postId,
        User: { profileRole, AthleteInfo, ClubInfo, BrandInfo },
      } = like;

      const profileData =
        profileRole === "ATHLETE"
          ? {
              profileId: AthleteInfo?.id,
              fullName: AthleteInfo?.fullName,
              profileImage: AthleteInfo?.profileImage,
              sportName: AthleteInfo?.sportName,
            }
          : profileRole === "CLUB"
          ? {
              profileId: ClubInfo?.id,
              clubName: ClubInfo?.clubName,
              logoImage: ClubInfo?.logoImage,
              sportName: ClubInfo?.sportName,
            }
          : {
              profileId: BrandInfo?.id,
              brandName: BrandInfo?.brandName,
              logoImage: BrandInfo?.logoImage,
              sportName: BrandInfo?.sportName,
            };

      return {
        likeId: id,
        userId,
        postId,
        profileInfo: profileData,
      };
    });

    const brandProfile = {
      profileId: BrandInfo?.id,
      name: BrandInfo?.brandName,
      profileImage: BrandInfo?.logoImage,
      sportName: BrandInfo?.sportName,
    };

    return {
      profile: showSponsoredPosts === "true" ? brandProfile : profileData,
      postData,
      likes: likesData,
    };
  });

  return { profile, metaData: posts.meta, posts: result };
};

// const getMyPosts

const getMyPosts = async (userId: string, query: any) => {
  const { showSponsoredPosts, ...restQuery } = query;
  const posts = await dynamicQueryBuilder({
    model: prisma.post,
    query: restQuery,
    forcedFilters: {
      userId,
      isSponsored: showSponsoredPosts === "true" ? true : false,
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
      likes: {
        select: {
          id: true,
          userId: true,
          postId: true,
          User: {
            select: {
              profileRole: true,
              AthleteInfo: {
                select: { id: true, fullName: true, profileImage: true },
              },
              ClubInfo: {
                select: { id: true, clubName: true, logoImage: true },
              },
              BrandInfo: {
                select: { id: true, brandName: true, logoImage: true },
              },
            },
          },
        },
      },
      BrandInfo: {
        select: {
          id: true,
          brandName: true,
          logoImage: true,
        },
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { AthleteInfo: true, ClubInfo: true },
  });

  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  const result = posts.data.map((post: any) => {
    const {
      id,
      AthleteInfo,
      ClubInfo,
      userDetails,
      athleteInfoId,
      clubInfoId,
      brandInfoId,
      BrandInfo,
      likes,
      ...postData
    } = post;

    const profileData =
      userDetails.profileRole === "ATHLETE"
        ? {
            profileId: AthleteInfo?.id,
            name: AthleteInfo?.fullName,
            profileImage: AthleteInfo?.profileImage,
            sportName: AthleteInfo?.sportName,
          }
        : {
            profileId: ClubInfo?.id,
            name: ClubInfo?.clubName,
            profileImage: ClubInfo?.logoImage,
            sportName: ClubInfo?.sportName,
          };

    const brandProfile = {
      profileId: BrandInfo?.id,
      name: BrandInfo?.brandName,
      profileImage: BrandInfo?.logoImage,
      sportName: BrandInfo?.sportName,
    };
    const likeData = post.likes.map((like: any) => {
      return {
        id: like.id,
        userId: like.userId,
        postId: like.postId,
        profile: {
          id: like.User.id,
          name:
            like.User.profileRole === "ATHLETE"
              ? like.User.AthleteInfo.fullName
              : like.User.profileRole === "CLUB"
              ? like.User.ClubInfo.clubName
              : like.User.BrandInfo.brandName,
          profileImage:
            like.User.profileRole === "ATHLETE"
              ? like.User.AthleteInfo.profileImage
              : like.User.profileRole === "CLUB"
              ? like.User.ClubInfo.logoImage
              : like.User.BrandInfo.logoImage,
          sportName:
            like.User.profileRole === "ATHLETE"
              ? like.User.AthleteInfo.sportName
              : like.User.profileRole === "CLUB"
              ? like.User.ClubInfo.sportName
              : "Sponsor",
        },
      };
    });

    return {
      profile: showSponsoredPosts === "true" ? brandProfile : profileData,
      postData,
      likes: likeData,
    };
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

const likePost = async (postId: string, userId: string) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new ApiError(StatusCodes.NOT_FOUND, "Post not found");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  const like = await prisma.like.create({
    data: {
      userId: user.id,
      postId: post.id,
    },
  });

  return like;
};

const unlikePost = async (postId: string, userId: string) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new ApiError(StatusCodes.NOT_FOUND, "Post not found");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  const like = await prisma.like.deleteMany({
    where: {
      userId: user.id,
      postId: post.id,
    },
  });

  return like;
};

export const postService = {
  createPostInDb,
  getAllPostsFromDb,
  getProfileDetailsFromDb,
  likePost,
  getMyPosts,
  unlikePost,
};
