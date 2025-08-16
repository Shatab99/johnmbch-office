import { format } from "date-fns";
import { prisma } from "../../../../utils/prisma";
import ApiError from "../../../error/ApiErrors";
import { dynamicQueryBuilder } from "../../../helper/queryBuilder";

const manageClubs = async (query: any) => {
  const data = await dynamicQueryBuilder({
    model: prisma.user,
    query,
    searchableFields: [
      "ClubInfo.clubName",
      "ClubInfo.country",
      "ClubInfo.city",
      "ClubInfo.sportName",
    ],
    includes: {
      ClubInfo: true,
    },
    forcedFilters: {
      profileRole: "CLUB",
    },
  });

  const clubs = await Promise.all(
    data.data.map(async (club: any) => {
      const totalTierAmount = await prisma.transactions.aggregate({
        _sum: { amount: true },
        where: { recipientId: club.id },
      });

      const supporters = await prisma.transactions.count({
        where: { recipientId: club.id, earningType: "SUPPORT" },
      });

      const sponsors = await prisma.transactions.count({
        where: { recipientId: club.id, earningType: "SPONSOR" },
      });

      const postCreated = await prisma.post.count({
        where: { userId: club.id },
      });
      const postRemoved = await prisma.postRemoveCount.count({
        where: { userId: club.id },
      });

      const formattedDate = format(
        new Date(club.ClubInfo.createdAt),
        "dd,MM,yyyy"
      );

      return {
        createDate: formattedDate,
        userId: club.ClubInfo.userId,
        name: club.ClubInfo.clubName,
        country: club.ClubInfo.country,
        city: club.ClubInfo.city,
        sport: club.ClubInfo.sportName,
        licenseImage: club.ClubInfo.licenseImage,
        certificateImage: club.ClubInfo.certificateImage,
        totalTierAmount: totalTierAmount._sum.amount || 0, // ✅ fix here
        supporters,
        sponsors,
        postCreated,
        postRemoved,
      };
    })
  );

  return { metadata: data.meta, data: clubs };
};

const manageClubDetails = async (clubUserId: string) => {
  const club = await prisma.user.findUnique({
    where: { id: clubUserId },
    include: {
      ClubInfo: true,
      Recipient: {
        include: {
          Donor: {
            include: {
              userDetails: {
                include: {
                  IndividualInfo: true,
                  BrandInfo: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!club) throw new ApiError(404, "Club not found");

  const sponsors = club.Recipient[0].Donor.map((donor) => {
    const { profileRole } = donor.userDetails;
    return profileRole === "BRAND"
      ? {
          userId: donor.userId,
          name: donor.userDetails.BrandInfo?.brandName,
          image: donor.userDetails.BrandInfo?.logoImage,
          sportName: "Sponsor",
        }
      : null;
  }).filter(Boolean);

  const supporters = club.Recipient[0].Donor.map((donor) => {
    const { profileRole } = donor.userDetails;

    return profileRole === "INDIVIDUAL"
      ? {
          userId: donor.userId,
          name: donor.userDetails.IndividualInfo?.fullName,
          image: donor.userDetails.IndividualInfo?.profileImage,
          sportName: "Supporter",
        }
      : null;
  }).filter(Boolean);

  return { supporters, sponsors };
};

const manageClubPostDetails = async (clubUserId: string) => {
  const posts = await prisma.post.findMany({
    where: { userId: clubUserId },
    include: {
      likes: true,
      AthleteInfo: true,
      ClubInfo: true,
      BrandInfo: true,
      IndividualInfo: true,
    },
  });

  return posts.map((post) => ({
    id: post.id,
    content: post.content,
    image: post.image,
    video: post.video,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    likes: post.likes.length,
    athleteInfo: post.AthleteInfo,
    clubInfo: post.ClubInfo,
    brandInfo: post.BrandInfo,
    individualInfo: post.IndividualInfo,
  }));
};

export const managementServices = {
  manageClubs,
  manageClubDetails,
  manageClubPostDetails,
};
