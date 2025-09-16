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
  if (user.profileRole === "INDIVIDUAL")
    throw new ApiError(
      StatusCodes.UNAUTHORIZED,
      "Supporter cannot create posts !"
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

const getAllPostsFromDb = async (query: any, userIdFromToken: string) => {
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
            userId: post.userId,
            profileId: AthleteInfo?.id,
            name: AthleteInfo?.fullName,
            profileImage: AthleteInfo?.profileImage,
            sportName: AthleteInfo?.sportName,
          }
        : {
            userId: post.userId,
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
              name: AthleteInfo?.fullName,
              profileImage: AthleteInfo?.profileImage,
              sportName: AthleteInfo?.sportName,
            }
          : profileRole === "CLUB"
          ? {
              profileId: ClubInfo?.id,
              name: ClubInfo?.clubName,
              profileImage: ClubInfo?.logoImage,
              sportName: ClubInfo?.sportName,
            }
          : {
              profileId: BrandInfo?.id,
              name: BrandInfo?.brandName,
              profileImage: BrandInfo?.logoImage,
              sportName: BrandInfo?.sportName,
            };

      return {
        likeId: id,
        userId,
        postId,
        profileInfo: profileData,
      };
    });

    const isLiked = likesData.some(
      (like: any) => like.userId === userIdFromToken
    );

    return {
      postData: { postId: post.id, ...restData, likes: likesData },
      profile: profileData,
      isLiked,
    };
  });

  return { metadata: posts.meta, result };
};

// get profile details and
const getProfileDetailsFromDb = async (
  profileUserId: string,
  userIdFromToken: string,
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
      isSponsored: false,
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
          id: true,
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
      IndividualInfo: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
  });

  const sponsoredPostdata = await dynamicQueryBuilder({
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
      isSponsored: true,
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
          id: true,
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
      IndividualInfo: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: profileUserId },
    include: { AthleteInfo: true, ClubInfo: true },
  });

  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  const athleteInfo = user.AthleteInfo;
  const clubInfo = user.ClubInfo;

  const profile = {
    userId: user.id,
    profileId: athleteInfo?.id || clubInfo?.id,
    profileRole: user?.profileRole,
    fullName: athleteInfo?.fullName || clubInfo?.clubName,
    profileImage: athleteInfo?.profileImage || clubInfo?.logoImage,
    sportName: athleteInfo?.sportName || clubInfo?.sportName,
    coverImage: user?.coverImage,
    bio: athleteInfo?.bio || clubInfo?.bio,
    clubName: athleteInfo?.clubName,
    member: clubInfo?.members,
    position: athleteInfo?.position,
    founded: clubInfo?.foundedYear,
    city: athleteInfo?.city || clubInfo?.city,
    country: athleteInfo?.country || clubInfo?.country,
    isOwner:
      userIdFromToken === athleteInfo?.userId ||
      userIdFromToken === clubInfo?.userId,
    sponsorsIds:
      user.profileRole === "CLUB"
        ? clubInfo?.sponsorsIds
        : user.profileRole === "ATHLETE"
        ? athleteInfo?.sponsorsIds
        : [],
  };

  const userFromToken = await prisma.user.findUnique({
    where: { id: userIdFromToken },
  });

  if (!userFromToken)
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");

  let isSubscribed: boolean =
    profile?.sponsorsIds?.includes(userIdFromToken) ?? false;

  const result = posts.data
    .map((post: any) => {
      const {
        id,
        AthleteInfo,
        ClubInfo,
        userDetails,
        athleteInfoId,
        clubInfoId,
        brandInfoId,
        BrandInfo,
        IndividualInfo,
        individualId,
        likes,
        isSponsored,
        ...restPostData
      } = post;

      const profileData =
        userDetails.profileRole === "ATHLETE"
          ? {
              userId: userDetails.id,
              profileId: AthleteInfo?.id,
              name: AthleteInfo?.fullName,
              profileImage: AthleteInfo?.profileImage,
              sportName: AthleteInfo?.sportName,
            }
          : {
              userId: userDetails.id,
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
          User: {
            profileRole,
            AthleteInfo,
            ClubInfo,
            BrandInfo,
            IndividualInfo,
          },
        } = like;

        const profileData =
          profileRole === "ATHLETE"
            ? {
                profileId: AthleteInfo?.id,
                name: AthleteInfo?.fullName,
                profileImage: AthleteInfo?.profileImage,
                sportName: AthleteInfo?.sportName,
              }
            : profileRole === "CLUB"
            ? {
                profileId: ClubInfo?.id,
                name: ClubInfo?.clubName,
                profileImage: ClubInfo?.logoImage,
                sportName: ClubInfo?.sportName,
              }
            : profileRole === "BRAND"
            ? {
                profileId: BrandInfo?.id,
                name: BrandInfo?.brandName,
                profileImage: BrandInfo?.logoImage,
                sportName: BrandInfo?.sportName,
              }
            : {
                profileId: IndividualInfo?.id,
                name: IndividualInfo?.fullName,
                profileImage: IndividualInfo?.profileImage,
                sportName: "Supporter",
              };

        return {
          likeId: id,
          userId,
          postId,
          profileInfo: profileData,
        };
      });

      const isLiked = likesData.some(
        (like: any) => like.userId === userIdFromToken
      );

      return {
        profile: profileData,
        postData: { postId: post.id, ...restPostData, likes: likesData },
        isLiked,
      };
    })
    .slice(0, isSubscribed ? undefined : 3);

  const sponsoredPosts = sponsoredPostdata.data.map((post: any) => {
    const {
      id,
      AthleteInfo,
      ClubInfo,
      userDetails,
      athleteInfoId,
      clubInfoId,
      brandInfoId,
      BrandInfo,
      IndividualInfo,
      likes,
      isSponsored,
      ...restPostData
    } = post;

    const likesData = likes.map((like: any) => {
      const {
        id,
        userId,
        postId,
        User: { profileRole, AthleteInfo, ClubInfo, BrandInfo, IndividualInfo },
      } = like;

      const profileData =
        profileRole === "ATHLETE"
          ? {
              profileId: AthleteInfo?.id,
              name: AthleteInfo?.fullName,
              profileImage: AthleteInfo?.profileImage,
              sportName: AthleteInfo?.sportName,
            }
          : profileRole === "CLUB"
          ? {
              profileId: ClubInfo?.id,
              name: ClubInfo?.clubName,
              profileImage: ClubInfo?.logoImage,
              sportName: ClubInfo?.sportName,
            }
          : profileRole === "BRAND"
          ? {
              profileId: BrandInfo?.id,
              name: BrandInfo?.brandName,
              profileImage: BrandInfo?.logoImage,
              sportName: BrandInfo?.sportName,
            }
          : {
              profileId: IndividualInfo?.id,
              name: IndividualInfo?.fullName,
              profileImage: IndividualInfo?.profileImage,
              sportName: "Supporter",
            };

      return {
        likeId: id,
        userId,
        postId,
        profileInfo: profileData,
      };
    });

    const isLiked = likesData.some(
      (like: any) => like.userId === userIdFromToken
    );

    const brandProfile = brandInfoId
      ? {
          userId: userDetails.id,
          profileId: BrandInfo?.id,
          name: BrandInfo?.brandName,
          profileImage: BrandInfo?.logoImage,
          sportName: "Sponsor",
        }
      : {
          userId: userDetails.id,
          profileId: IndividualInfo?.id,
          name: IndividualInfo?.fullName,
          profileImage: IndividualInfo?.profileImage,
          sportName: "Supporter",
        };

    return {
      isSubscribed,
      profile: brandProfile,
      postData: { postId: post.id, ...restPostData, likes: likesData },
      isLiked,
    };
  });

  return { profile, metaData: posts.meta, posts: result, sponsoredPosts };
};

// const getMyPosts

const getMyPosts = async (userIdFromToken: string, query: any) => {
  const { showSponsoredPosts, ...restQuery } = query;
  const posts = await dynamicQueryBuilder({
    model: prisma.post,
    query: restQuery,
    forcedFilters: {
      userId: userIdFromToken,
      isSponsored: false,
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
              IndividualInfo: {
                select: { id: true, fullName: true, profileImage: true },
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
      IndividualInfo: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
  });

  const sponsoredPostdata = await dynamicQueryBuilder({
    model: prisma.post,
    query: restQuery,
    forcedFilters: {
      userId: userIdFromToken,
      isSponsored: true,
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
              IndividualInfo: {
                select: { id: true, fullName: true, profileImage: true },
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
      IndividualInfo: {
        select: {
          id: true,
          fullName: true,
          profileImage: true,
        },
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userIdFromToken },
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
      IndividualInfo,
      likes,
      ...restPostData
    } = post;

    const profileData =
      userDetails.profileRole === "ATHLETE"
        ? {
            userId: userDetails.id,
            profileId: AthleteInfo?.id,
            name: AthleteInfo?.fullName,
            profileImage: AthleteInfo?.profileImage,
            sportName: AthleteInfo?.sportName,
          }
        : {
            userId: userDetails.id,
            profileId: ClubInfo?.id,
            name: ClubInfo?.clubName,
            profileImage: ClubInfo?.logoImage,
            sportName: ClubInfo?.sportName,
          };

    const brandProfile =
      userDetails.profileRole === "BRAND"
        ? {
            userId: userDetails.id,
            profileId: BrandInfo?.id,
            name: BrandInfo?.brandName,
            profileImage: BrandInfo?.logoImage,
            sportName: "Sponsor",
          }
        : {
            userId: userDetails.id,
            profileId: IndividualInfo?.id,
            name: IndividualInfo?.fullName || "Sponsor",
            profileImage: IndividualInfo?.profileImage,
            sportName: "Supporter",
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
              : like.User.profileRole === "BRAND"
              ? like.User.BrandInfo.brandName
              : like.User.IndividualInfo?.fullName || "Sponsor",
          profileImage:
            like.User.profileRole === "ATHLETE"
              ? like.User.AthleteInfo.profileImage
              : like.User.profileRole === "CLUB"
              ? like.User.ClubInfo.logoImage
              : like.User.profileRole === "BRAND"
              ? like.User.BrandInfo.logoImage
              : like.User.IndividualInfo?.profileImage,
          sportName:
            like.User.profileRole === "ATHLETE"
              ? like.User.AthleteInfo.sportName
              : like.User.profileRole === "CLUB"
              ? like.User.ClubInfo.sportName
              : like.User.profileRole === "BRAND"
              ? "Sponsor"
              : "Supporter",
        },
      };
    });

    const isLiked = likeData.some(
      (like: any) => like.userId === userIdFromToken
    );

    return {
      profile: showSponsoredPosts === "true" ? brandProfile : profileData,
      postData: { ...restPostData, likes: likeData },
      isLiked,
    };
  });

  const sponsoredPosts = sponsoredPostdata.data.map((post: any) => {
    const {
      id,
      AthleteInfo,
      ClubInfo,
      userDetails,
      athleteInfoId,
      clubInfoId,
      brandInfoId,
      BrandInfo,
      IndividualInfo,
      individualId,
      isSponsored,
      likes,
      ...restPostData
    } = post;

    const profileData =
      userDetails.profileRole === "ATHLETE"
        ? {
            userId: userDetails.id,
            profileId: AthleteInfo?.id,
            name: AthleteInfo?.fullName,
            profileImage: AthleteInfo?.profileImage,
            sportName: AthleteInfo?.sportName,
          }
        : {
            userId: userDetails.id,
            profileId: ClubInfo?.id,
            name: ClubInfo?.clubName,
            profileImage: ClubInfo?.logoImage,
            sportName: ClubInfo?.sportName,
          };

    const brandProfile =
      isSponsored && brandInfoId
        ? {
            userId: userDetails.id,
            profileId: BrandInfo?.id,
            name: BrandInfo?.brandName,
            profileImage: BrandInfo?.logoImage,
            sportName: "Sponsor",
          }
        : isSponsored && individualId
        ? {
            userId: userDetails.id,
            profileId: IndividualInfo?.id,
            name: IndividualInfo?.fullName || "Sponsor",
            profileImage: IndividualInfo?.profileImage,
            sportName: "Supporter",
          }
        : null;

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
              : like.User.profileRole === "BRAND"
              ? like.User.BrandInfo.brandName
              : like.User.IndividualInfo?.fullName || "Sponsor",
          profileImage:
            like.User.profileRole === "ATHLETE"
              ? like.User.AthleteInfo.profileImage
              : like.User.profileRole === "CLUB"
              ? like.User.ClubInfo.logoImage
              : like.User.profileRole === "BRAND"
              ? like.User.BrandInfo.logoImage
              : like.User.IndividualInfo?.profileImage,
          sportName:
            like.User.profileRole === "ATHLETE"
              ? like.User.AthleteInfo.sportName
              : like.User.profileRole === "CLUB"
              ? like.User.ClubInfo.sportName
              : like.User.profileRole === "BRAND"
              ? "Sponsor"
              : "Supporter",
        },
      };
    });

    const isLiked = likeData.some(
      (like: any) => like.userId === userIdFromToken
    );
    return {
      profile: isSponsored ? brandProfile : profileData,
      postData: { ...restPostData, likes: likeData },
      isLiked,
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
    bio: athleteInfo?.bio || clubInfo?.bio,
    clubName: athleteInfo?.clubName,
    member: clubInfo?.members,
    position: athleteInfo?.position,
    founded: clubInfo?.foundedYear,
    city: athleteInfo?.city || clubInfo?.city,
    country: athleteInfo?.country || clubInfo?.country,
    isOwner:
      userIdFromToken === athleteInfo?.userId ||
      userIdFromToken === clubInfo?.userId,
  };

  return { profile, metadata: posts.meta, posts: result, sponsoredPosts };
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

const searchProfile = async (query: any) => {
  if (!query) {
    return [];
  }

  const { search } = query;

  // Search AthleteInfo
  const athletes = await prisma.athleteInfo.findMany({
    where: {
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { clubName: { contains: search, mode: "insensitive" } },
        { sportName: { contains: search, mode: "insensitive" } },
      ],
    },
    select: {
      userId: true,
      fullName: true,
      profileImage: true,
      sportName: true,
    },
  });

  // Search ClubInfo
  const clubs = await prisma.clubInfo.findMany({
    where: {
      OR: [
        { clubName: { contains: search, mode: "insensitive" } },
        { sportName: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { country: { contains: search, mode: "insensitive" } },
      ],
    },
    select: {
      userId: true,
      clubName: true,
      logoImage: true,
      sportName: true,
    },
  });

  // Map and unify all profiles
  const mapProfile = (
    userId: string,
    name: string | null | undefined,
    image: string | null | undefined,
    sportName: string | null | undefined
  ) => ({
    userId: userId,
    profileName: name || "Unknown",
    profileImage: image || "",
    sportName: sportName,
  });

  const result = [
    ...athletes.map((a) =>
      mapProfile(a.userId, a.fullName, a.profileImage, a.sportName)
    ),
    ...clubs.map((c) =>
      mapProfile(c.userId, c.clubName, c.logoImage, c.sportName)
    ),
  ];

  return result;
};

const deletePost = async (postId: string, userId: string) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new ApiError(StatusCodes.NOT_FOUND, "Post not found");

  if (post.userId !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not allowed to delete this post"
    );
  }

  await prisma.post.delete({ where: { id: postId } });
  return "Post deleted successfully";
};

const editPost = async (
  postId: string,
  userId: string,
  updateData: any,
  files: any
) => {
  const video = (await getFileUrl(files.video?.[0])) || null;
  const image = files.image?.[0]?.location || null;
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) throw new ApiError(StatusCodes.NOT_FOUND, "Post not found");

  if (post.userId !== userId) {
    throw new ApiError(
      StatusCodes.FORBIDDEN,
      "You are not allowed to edit this post"
    );
  }

  const updatedPost = await prisma.post.update({
    where: { id: postId },
    data: {
      ...updateData,
      video: video ? video : post.video,
      image: image ? image : post.image,
    },
  });

  return updatedPost;
};

export const postService = {
  createPostInDb,
  getAllPostsFromDb,
  getProfileDetailsFromDb,
  likePost,
  getMyPosts,
  unlikePost,
  searchProfile,
  deletePost,
  editPost,
};
