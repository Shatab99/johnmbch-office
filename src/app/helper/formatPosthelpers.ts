// 1️⃣ Helper - Prisma includes for posts
export const getPostIncludes = () => ({
  AthleteInfo: {
    select: { id: true, fullName: true, profileImage: true, sportName: true },
  },
  ClubInfo: {
    select: { id: true, clubName: true, logoImage: true, sportName: true },
  },
  userDetails: { select: { profileRole: true } },
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
          BrandInfo: { select: { id: true, brandName: true, logoImage: true } },
        },
      },
    },
  },
  BrandInfo: {
    select: { id: true, brandName: true, logoImage: true, sportName: true },
  },
});

// 2️⃣ Helper - Map profile data
export const mapProfileData = (
  profileRole: string,
  AthleteInfo?: any,
  ClubInfo?: any,
  BrandInfo?: any
) => {
  if (profileRole === "ATHLETE") {
    return {
      profileId: AthleteInfo?.id,
      fullName: AthleteInfo?.fullName,
      profileImage: AthleteInfo?.profileImage,
      sportName: AthleteInfo?.sportName,
    };
  }
  if (profileRole === "CLUB") {
    return {
      profileId: ClubInfo?.id,
      clubName: ClubInfo?.clubName,
      logoImage: ClubInfo?.logoImage,
      sportName: ClubInfo?.sportName,
    };
  }
  return {
    profileId: BrandInfo?.id,
    brandName: BrandInfo?.brandName,
    logoImage: BrandInfo?.logoImage,
    sportName: BrandInfo?.sportName,
  };
};

// 3️⃣ Helper - Map likes array
export const mapLikes = (likes: any[]) =>
  likes.map(({ id, userId, postId, User }: any) => ({
    likeId: id,
    userId,
    postId,
    profileInfo: mapProfileData(
      User.profileRole,
      User.AthleteInfo,
      User.ClubInfo,
      User.BrandInfo
    ),
  }));

// 4️⃣ Main reusable post mapper
export const mapPosts = (posts: any[], showSponsoredPosts = false) =>
  posts.map(
    ({
      likes,
      AthleteInfo,
      ClubInfo,
      userDetails,
      BrandInfo,
      ...postData
    }: any) => {
      const profile = showSponsoredPosts
        ? mapProfileData("BRAND", undefined, undefined, BrandInfo)
        : mapProfileData(userDetails.profileRole, AthleteInfo, ClubInfo);

      return {
        profile,
        postData,
        likes: mapLikes(likes),
      };
    }
  );
