import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../utils/prisma";
import ApiError from "../../error/ApiErrors";

const getSponsorsProfile = async (userId: string, role: string) => {
  if (!role)
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Role is required on query field"
    );

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const profileRole = user?.profileRole;
  const where =
    profileRole === "BRAND" ? { userId: userId } : { recipientUserId: userId };

  const data = await prisma.donor.findMany({
    where,
    include: {
      tierDetails: true,
      userDetails: {
        include: {
          BrandInfo: true,
        },
      },
      recipient: {
        include: {
          userDetails: {
            include: {
              AthleteInfo: true,
              ClubInfo: true,
              BrandInfo: true,
            },
          },
        },
      },
    },
  });

  const result = data
    .map((sponsor) => {
      const { recipient, tierDetails, userDetails } = sponsor;
      const { BrandInfo } = userDetails; // only for sponsor supporter
      const user = recipient.userDetails;
      const { AthleteInfo, ClubInfo } = user; // athlete, club

      const recipientProfile =
        role === "athlete" && user.profileRole === "ATHLETE"
          ? {
              userId: user.id,
              profileId: AthleteInfo?.id,
              name: AthleteInfo?.fullName,
              image: AthleteInfo?.profileImage,
              sportName: AthleteInfo?.sportName,
            }
          : role === "club" && user.profileRole === "CLUB"
          ? {
              userId: user.id,
              profileId: ClubInfo?.id,
              name: ClubInfo?.clubName,
              image: ClubInfo?.logoImage,
              sportName: ClubInfo?.sportName,
            }
          : null;

      const sponsorProfile =
        role === "sponsor" && tierDetails?.type === "BRAND"
          ? {
              userId: userDetails.id,
              profileId: BrandInfo?.id,
              name: BrandInfo?.brandName,
              image: BrandInfo?.logoImage,
              sportName: "Sponsor",
            }
          : role === "supporter" && tierDetails?.type === "INDIVIDUAL"
          ? {
              userId: userDetails.id,
              profileId: BrandInfo?.id,
              name: BrandInfo?.brandName,
              image: BrandInfo?.logoImage,
              sportName: "Supporter",
            }
          : null;

      return profileRole === "ATHLETE" ? sponsorProfile : recipientProfile;
    })
    .filter(Boolean);

  return result;
};

const getClubAthleteSponsors = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (user?.profileRole === "INDIVIDUAL" || user?.profileRole === "BRAND")
    throw new ApiError(StatusCodes.FORBIDDEN, "forbidden");

  const donors = await prisma.donor.findMany({
    where: { recipientUserId: userId },
    include: {
      tierDetails: true,
      posts: {
        include: {
          BrandInfo: true,
          AthleteInfo: true,
          ClubInfo: true,
          userDetails: {
            include: {
              BrandInfo: true,
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
                      userId: true,
                    },
                  },
                  ClubInfo: {
                    select: {
                      id: true,
                      clubName: true,
                      logoImage: true,
                      sportName: true,
                      userId: true,
                    },
                  },
                  BrandInfo: {
                    select: {
                      id: true,
                      brandName: true,
                      logoImage: true,
                      userId: true,
                    },
                  },
                  IndividualInfo: {
                    select: {
                      id: true,
                      fullName: true,
                      profileImage: true,
                      userId: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      userDetails: {
        include: {
          BrandInfo: true,
          IndividualInfo: true,
        },
      },
    },
  });

  // const { id, name, type } = donors.map((donor) => donor.tierDetails);

  const supporters = donors
    .map((donor) => {
      const { IndividualInfo } = donor.userDetails;

      return (
        donor.userDetails.profileRole === "INDIVIDUAL" && {
          userId: IndividualInfo?.userId,
          name: IndividualInfo?.fullName,
          image: IndividualInfo?.profileImage,
          sportName: "Supporter",
        }
      );
    })
    .filter(Boolean);

  const sponsors = donors
    .map((donor) => {
      const { posts } = donor;

      if (!posts) return null;
      const {
        id,
        AthleteInfo,
        BrandInfo,
        ClubInfo,
        userDetails,
        ...restPostData
      } = posts;

      const likesData = posts?.likes.map((like) => {
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
                sportName: "Sponsor",
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
      const isLiked = likesData?.some((like: any) => like.userId === userId);
      const profile = {
        userId: posts?.userDetails.id,
        profileId: userDetails?.BrandInfo?.id,
        name: BrandInfo?.brandName,
        profileImage: BrandInfo?.logoImage,
        sportName: "Sponsor",
      };

      return {
        profile,
        postData: { ...restPostData, likes: likesData },
        isLiked,
      };
    })
    .filter(Boolean);

  return { sponsors, supporters };
};

const getSponsorSupporterFavourite = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (user?.profileRole === "CLUB" || user?.profileRole === "ATHLETE")
    throw new ApiError(StatusCodes.FORBIDDEN, "forbidden");

  const favourites = await prisma.donor.findMany({
    where: {
      userId,
    },
    include: {
      recipient: {
        include: {
          userDetails: {
            include: {
              AthleteInfo: true,
              ClubInfo: true,
            },
          },
        },
      },
    },
  });

  const athletes = favourites
    .map((favourite) => {
      const { userDetails } = favourite.recipient;

      const profile = userDetails.profileRole === "ATHLETE" && {
        userId: userDetails.id,
        profileId: userDetails.AthleteInfo?.id,
        name: userDetails.AthleteInfo?.fullName,
        image: userDetails.AthleteInfo?.profileImage,
        sportName: userDetails.AthleteInfo?.sportName,
      };

      return profile;
    })
    .filter(Boolean);

  const clubs = favourites
    .map((favourite) => {
      const { userDetails } = favourite.recipient;

      const profile = userDetails.profileRole === "CLUB" && {
        userId: userDetails.id,
        profileId: userDetails.ClubInfo?.id,
        name: userDetails.ClubInfo?.clubName,
        image: userDetails.ClubInfo?.logoImage,
        sportName: userDetails.ClubInfo?.sportName,
      };

      return profile;
    })
    .filter(Boolean);

  return { athletes, clubs };
};

export const sponsorService = {
  getSponsorsProfile,
  getClubAthleteSponsors,
  getSponsorSupporterFavourite,
};
