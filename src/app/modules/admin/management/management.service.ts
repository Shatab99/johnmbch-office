import { format } from "date-fns";
import { prisma } from "../../../../utils/prisma";
import ApiError from "../../../error/ApiErrors";
import { dynamicQueryBuilder } from "../../../helper/queryBuilder";

const manageClubs = async (query: any) => {
  const { role, ...restQuery } = query;
  const data =
    role === "club"
      ? await dynamicQueryBuilder({
          model: prisma.user,
          query: restQuery,
          searchableFields: [
            "ClubInfo.clubName",
            "ClubInfo.country",
            "ClubInfo.city",
            "ClubInfo.sportName",
          ],
          includes: {
            ClubInfo: true,
            AthleteInfo: true,
          },
          forcedFilters: {
            profileRole: "CLUB",
          },
        })
      : await dynamicQueryBuilder({
          model: prisma.user,
          query: restQuery,
          searchableFields: [
            "AthleteInfo.fullName",
            "AthleteInfo.sportName",
            "AthleteInfo.country",
            "AthleteInfo.city",
          ],
          includes: {
            ClubInfo: true,
            AthleteInfo: true,
          },
          forcedFilters: {
            profileRole: "ATHLETE",
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
        new Date(
          role === "club" ? club.ClubInfo.createdAt : club.AthleteInfo.createdAt
        ),
        "dd,MM,yyyy"
      );

      return {
        createDate: formattedDate,
        userId:
          role === "club" ? club.ClubInfo.userId : club.AthleteInfo.userId,
        name:
          role === "club" ? club.ClubInfo.clubName : club.AthleteInfo.fullName,
        country:
          role === "club" ? club.ClubInfo.country : club.AthleteInfo.country,
        city: role === "club" ? club.ClubInfo.city : club.AthleteInfo.city,
        sport:
          role === "club"
            ? club.ClubInfo.sportName
            : club.AthleteInfo.sportName,
        ...(role === "athlete" && {
          passportOrNidImg: club.AthleteInfo.passportOrNidImg,
          selfieImage: club.AthleteInfo.selfieImage,
        }),
        ...(role === "club" && {
          licenseImage: club.ClubInfo.licenseImage,
          certificateImage: club.ClubInfo.certificateImage,
        }),
        totalTierAmount: totalTierAmount._sum.amount || 0,
        supporters,
        sponsors,
        postCreated,
        postRemoved,
        status: club.status,
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
      AthleteInfo: true,
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

  const sponsors =
    club.Recipient?.flatMap((recipient) =>
      recipient.Donor.map((donor) => {
        const { profileRole } = donor.userDetails;
        return profileRole === "BRAND"
          ? {
              userId: donor.userId,
              name: donor.userDetails.BrandInfo?.brandName,
              image: donor.userDetails.BrandInfo?.logoImage,
              sportName: "Sponsor",
            }
          : null;
      })
    ).filter(Boolean) || [];

  const supporters =
    club.Recipient.flatMap((recipient) =>
      recipient.Donor.map((donor) => {
        const { profileRole } = donor.userDetails;
        return profileRole === "INDIVIDUAL"
          ? {
              userId: donor.userId,
              name: donor.userDetails.IndividualInfo?.fullName,
              image: donor.userDetails.IndividualInfo?.profileImage,
              sportName: "Supporter",
            }
          : null;
      })
    ).filter(Boolean) || [];

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

  const clubProfile = await prisma.clubInfo.findUnique({
    where: { userId: clubUserId },
  });

  return posts.map((post) => {
    const profile = {
      name: clubProfile?.clubName,
      image: clubProfile?.logoImage,
      sportName: clubProfile?.sportName,
    };
    const postData = {
      id: post.id,
      content: post.content,
      image: post.image,
      video: post.video,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
    return { profile, postData };
  });
};

const deletePost = async (postId: string) => {
  await prisma.post.delete({
    where: { id: postId },
  });
  return "successfully deleted";
};

const manageSupporterSponsors = async (query: any) => {
  const { role, ...restQuery } = query;

  const data =
    role === "brand"
      ? await dynamicQueryBuilder({
          model: prisma.user,
          query: restQuery,
          searchableFields: [
            "BrandInfo.brandName",
            "BrandInfo.country",
            "BrandInfo.city",
          ],
          includes: {
            BrandInfo: true,
            IndividualInfo: true,
          },
          forcedFilters: {
            profileRole: "BRAND",
          },
        })
      : await dynamicQueryBuilder({
          model: prisma.user,
          query: restQuery,
          searchableFields: [
            "IndividualInfo.fullName",
            "IndividualInfo.country",
            "IndividualInfo.city",
          ],
          includes: {
            IndividualInfo: true,
            BrandInfo: true,
          },
          forcedFilters: {
            profileRole: "INDIVIDUAL",
          },
        });

  const supporterSponsors = await Promise.all(
    data.data.map(async (user: any) => {
      const totalAmountDonated = await prisma.transactions.aggregate({
        where: { senderId: user.id },
        _sum: { amount: true },
      });

      const athletes = await prisma.transactions.count({
        where: {
          senderId: user.id,
          Recipient: {
            profileRole: "ATHLETE",
          },
        },
      });

      const clubs = await prisma.transactions.count({
        where: {
          senderId: user.id,
          Recipient: {
            profileRole: "CLUB",
          },
        },
      });

      const formattedDate = format(
        new Date(
          role === "brand"
            ? user.BrandInfo.createdAt
            : user.IndividualInfo.createdAt
        ),
        "dd,MM,yyyy"
      );

      return {
        createDate: formattedDate,
        userId:
          role === "brand" ? user.BrandInfo.userId : user.IndividualInfo.userId,
        name:
          role === "brand"
            ? user.BrandInfo.brandName
            : user.IndividualInfo.fullName,
        country:
          role === "brand"
            ? user.BrandInfo.country
            : user.IndividualInfo.country,
        city: role === "brand" ? user.BrandInfo.city : user.IndividualInfo.city,
        tierDonated: totalAmountDonated._sum.amount || 0,
        status: user.status,
        athletes,
        clubs,
      };
    })
  );

  return { metadata: data.meta, data: supporterSponsors };
};

export const managementServices = {
  manageClubs,
  manageClubDetails,
  manageClubPostDetails,
  deletePost,
  manageSupporterSponsors,
};
