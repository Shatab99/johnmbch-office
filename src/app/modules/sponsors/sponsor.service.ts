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

export const sponsorService = {
  getSponsorsProfile,
};
