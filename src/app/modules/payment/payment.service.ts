import { StatusCodes } from "http-status-codes";
import { stripe } from "../../../config/stripe";
import { prisma } from "../../../utils/prisma";
import ApiError from "../../error/ApiErrors";
import { notificationServices } from "../notifications/notification.service";
import Stripe from "stripe";

// const saveCardInStripe = async (payload: {
//   paymentMethodId: string;
//   cardholderName?: string;
//   userId: string;
// }) => {
//   const user = await prisma.user.findUnique({ where: { id: payload.userId } });
//   if (!user) {
//     throw new ApiError(404, "User not found!");
//   }
//   const { paymentMethodId, cardholderName } = payload;
//   let customerId = user.customerId;
//   if (!customerId) {
//     const customer = await stripe.customers.create({
//       email: user.email as string,
//       payment_method: paymentMethodId,
//       invoice_settings: {
//         default_payment_method: paymentMethodId,
//       },
//     });
//     customerId = customer.id;
//     await prisma.user.update({
//       where: { id: payload.userId },
//       data: { customerId },
//     });
//   }

//   const paymentMethods = await stripe.paymentMethods.list({
//     customer: customerId,
//     type: "card",
//   });

//   const newCard: any = await stripe.paymentMethods.retrieve(paymentMethodId);

//   const existingCard = paymentMethods.data.find(
//     (card: any) => card.card.last4 === newCard.card.last4
//   );

//   if (existingCard) {
//     throw new ApiError(409, "This card is already saved.");
//   } else {
//     await stripe.paymentMethods.attach(paymentMethodId, {
//       customer: customerId,
//     });
//     await stripe.paymentMethods.update(paymentMethodId, {
//       billing_details: {
//         name: cardholderName,
//       },
//     });
//     return {
//       message: "Customer created and card saved successfully",
//     };
//   }
// };

// const getSaveCardsFromStripe = async (userId: string) => {
//   const user = await prisma.user.findUnique({ where: { id: userId } });
//   if (!user) {
//     throw new ApiError(404, "User not found!");
//   }

//   const saveCard = await stripe.paymentMethods.list({
//     customer: user?.customerId || "",
//     type: "card",
//   });

//   const cardDetails = saveCard.data.map((card: Stripe.PaymentMethod) => {
//     return {
//       id: card.id,
//       brand: card.card?.brand,
//       last4: card.card?.last4,
//       type: card.card?.checks?.cvc_check === "pass" ? "valid" : "invalid",
//       exp_month: card.card?.exp_month,
//       exp_year: card.card?.exp_year,
//       billing_details: card.billing_details,
//     };
//   });

//   return cardDetails;
// };

// const deleteCardFromStripe = async (userId: string, last4: string) => {
//   const user = await prisma.user.findUnique({ where: { id: userId } });
//   if (!user) {
//     throw new ApiError(404, "User not found!");
//   }
//   if (!user.customerId) {
//     throw new ApiError(404, "Card is not saved");
//   }

//   const paymentMethods = await stripe.paymentMethods.list({
//     customer: user.customerId,
//     type: "card",
//   });
//   const card = paymentMethods.data.find(
//     (card: any) => card.card.last4 === last4
//   );
//   if (!card) {
//     throw new ApiError(404, "Card not found!");
//   }
//   await stripe.paymentMethods.detach(card.id);
// };

const createStripeProductAndPrice = async (tier: any) => {
  const product = await stripe.products.create({
    name: tier.title,
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: Math.round(tier.amount * 100),
    currency: "usd",
    recurring: { interval: "month" },
  });

  return { product, price };
};

const getOrCreateCustomer = async (user: any, paymentMethodId: string) => {
  if (user.customerId) {
    return user.customerId;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    payment_method: paymentMethodId,
    invoice_settings: {
      default_payment_method: paymentMethodId,
    },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { customerId: customer.id },
  });

  return customer.id;
};

const createStripeSubscription = async ({
  customerId,
  priceId,
  providerAccountId, // connected account id
  tierAmount,
}: {
  customerId: string;
  priceId: string;
  providerAccountId: string;
  tierAmount: number;
}) => {
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
    application_fee_percent: 10,
    transfer_data: {
      destination: providerAccountId,
    },
  });

  return subscription;
};

const joinTier = async (userId: string, body: any, files: any) => {
  const image = files.banner?.[0]?.location;
  const {
    tierId,
    clubOrPlayerUserId: providerId,
    content,
    paymentMethodId,
  } = body;

  const tier = await prisma.tier.findUnique({ where: { id: tierId } });
  if (!tier) throw new ApiError(StatusCodes.NOT_FOUND, "Tier not found!");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { BrandInfo: true, IndividualInfo: true },
  });
  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found!");

  const provider = await prisma.user.findUnique({ where: { id: providerId } });
  if (!provider || !provider.connectAccountId)
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "Provider not connected to Stripe!"
    );

  if (user.profileRole !== tier.type)
    throw new ApiError(StatusCodes.FORBIDDEN, "You can not pay in this tier");

  // get or create Stripe customer
  const customerId = await getOrCreateCustomer(user, paymentMethodId);

  // get product/price for tier
  const { price } = await createStripeProductAndPrice(tier);

  // create subscription
  const subscription = await createStripeSubscription({
    customerId,
    priceId: price.id,
    providerAccountId: provider.connectAccountId,
    tierAmount: tier.amount,
  });

  // store subscription in DB
  await prisma.subscribedUser.create({
    data: {
      customerId,
      subscriptionStatus: "ACTIVE",
      subscriptionId: subscription.id,
      recipientUserId: providerId,
    },
  });

  //post work

  const brandInfo = await prisma.brandInfo.findUnique({ where: { userId } });
  if (!brandInfo)
    throw new ApiError(StatusCodes.NOT_FOUND, "Brand info not found!");

  const clubORAthleteUser = await prisma.user.findUnique({
    where: { id: providerId, status: "ACTIVE" },
    include: {
      AthleteInfo: true,
      ClubInfo: true,
    },
  });

  if (!clubORAthleteUser)
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found!");

  if (image && !tier.showBanner)
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You cannot upload a banner for this tier!"
    );
  if (content && !tier.showContent)
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You cannot upload content for this tier!"
    );

  if (brandInfo && !tier.showProfile)
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "You cannot upload a profile for this tier!"
    );

  const post = await prisma.post.create({
    data: {
      userId: providerId,
      content: tier.showContent ? content : undefined,
      image: tier.showBanner ? image : undefined,
      brandInfoId: tier.showProfile ? brandInfo.id : undefined,
      isSponsored: true,
    },
  });

  //create donor and recipient

  const recipient = await prisma.recipient.create({
    data: {
      userId: providerId as string,
      tierId: tierId as string,
      amount: tier.amount,
      postId: post.id,
    },
  });

  await prisma.donor.create({
    data: {
      userId: userId,
      tierId: tierId as string,
      amount: tier.amount,
      recipientId: recipient.id as string,
      recipientUserId: providerId as string,
      postId: post.id,
    },
  });

  // //create room for chat

  // await prisma.room.create({
  //   data: {
  //     senderId: userId,
  //     receiverId: providerId,
  //   },
  // });

  // Make a transaction history

  await prisma.transactions.create({
    data: {
      senderId: userId,
      recipientId: providerId,
      amount: tier.amount,
      earningType: tier.type === "BRAND" ? "SPONSOR" : "SUPPORT",
      tierId: tier.id,
    },
  });

  // Donor notification
  await notificationServices.sendSingleNotification(providerId, userId, {
    title: `New ${tier.type === "BRAND" ? "Sponsorship" : "Support"} Tier`,
    image:
      clubORAthleteUser?.profileRole === "ATHLETE"
        ? clubORAthleteUser?.AthleteInfo?.profileImage
        : clubORAthleteUser?.ClubInfo?.logoImage,
    body: `You’ve successfully subscribed to ${
      clubORAthleteUser?.profileRole === "ATHLETE"
        ? clubORAthleteUser?.AthleteInfo?.fullName
        : clubORAthleteUser?.ClubInfo?.clubName
    } with $${tier.amount}/month. Thank you for your support.`,
  });

  // Recipient notification
  await notificationServices.sendSingleNotification(userId, providerId, {
    title: `New ${tier.type === "BRAND" ? "Sponsorship" : "Support"} Tier`,
    image:
      user.profileRole === "BRAND"
        ? user.BrandInfo?.logoImage
        : user.IndividualInfo?.profileImage,
    body: `${
      user.profileRole === "BRAND"
        ? user.BrandInfo?.brandName
        : user.IndividualInfo?.fullName
    } has successfully subscribed to your ${
      tier.type === "BRAND" ? "Sponsorship" : "Support"
    } Tier with $${tier.amount}/month.`,
  });

  // Admin notifications

  await notificationServices.sendSingleNotification(
    userId,
    "6890552809eee7b6eb0593e3",
    {
      title: `New ${tier.type === "BRAND" ? "Sponsorship" : "Support"} Tier`,
      role: "ADMIN",
      image:
        clubORAthleteUser?.profileRole === "ATHLETE"
          ? clubORAthleteUser?.AthleteInfo?.profileImage
          : clubORAthleteUser?.ClubInfo?.logoImage,
      body: `${
        user.profileRole === "BRAND"
          ? user.BrandInfo?.brandName
          : user.IndividualInfo?.fullName
      } successfully subscribed to ${
        clubORAthleteUser?.profileRole === "ATHLETE"
          ? clubORAthleteUser?.AthleteInfo?.fullName
          : clubORAthleteUser?.ClubInfo?.clubName
      } with $${tier.amount}/month. Thank you for your support.`,
    }
  );

  const message = `Successfully ${
    tier.type === "BRAND" ? "sponsored" : "supported"
  } tier on ${
    clubORAthleteUser?.profileRole === "CLUB"
      ? clubORAthleteUser.ClubInfo?.clubName
      : clubORAthleteUser?.AthleteInfo?.fullName
  } profile`;

  return {
    message,
    subscriptionId: subscription.id,
  };
};
const splitPaymentFromStripe = async (
  payload: {
    amount: number;
    paymentMethodId: string;
    providerId: string;
    paymentMethod?: string;
  },
  customerId: string
) => {
  const finderUser = await prisma.user.findUnique({
    where: { id: payload.providerId },
  });

  if (finderUser?.connectAccountId === null) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "This user is not connected to Stripe !"
    );
  }
  // 2️⃣ Attach payment method to customer
  await stripe.paymentMethods.attach(payload.paymentMethodId, {
    customer: customerId,
  });

  const payment = await stripe.paymentIntents.create({
    amount: Math.round(payload.amount * 100),
    currency: payload?.paymentMethod || "usd",
    payment_method: payload.paymentMethodId,
    confirm: true,
    customer: customerId,
    payment_method_types: ["card"], // 🔥 Important: to avoid auto-redirects or default behavior
    application_fee_amount: Math.round(payload.amount * 0.1 * 100), // $7 in cents , 10% here
    transfer_data: {
      destination: finderUser?.connectAccountId as string,
    },
  });

  console.log(payment);

  if (payment.status !== "succeeded") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Payment failed!");
  }

  return payment;
};
const quickSupport = async (
  amount: number,
  providerId: string,
  paymentMethodId: string,
  userId: string
) => {
  const paymentdata = {
    providerId,
    paymentMethodId,
    amount: amount,
    paymentMethod: "usd",
  };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      BrandInfo: true,
      IndividualInfo: true,
    },
  });

  const clubORAthleteUser = await prisma.user.findUnique({
    where: { id: providerId, status: "ACTIVE" },
    include: {
      AthleteInfo: true,
      ClubInfo: true,
    },
  });

  if (!clubORAthleteUser)
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found!");

  const result = await splitPaymentFromStripe(paymentdata, user?.customerId!);

  // donor notifications
  await notificationServices.sendSingleNotification(providerId, userId, {
    title: "Quick Support",
    image:
      clubORAthleteUser?.profileRole === "ATHLETE"
        ? clubORAthleteUser?.AthleteInfo?.profileImage
        : clubORAthleteUser?.ClubInfo?.logoImage,
    body: `You have successfully sent $${amount} to ${
      clubORAthleteUser?.profileRole === "ATHLETE"
        ? clubORAthleteUser?.AthleteInfo?.fullName
        : clubORAthleteUser?.ClubInfo?.clubName
    }. Thank you for your support.`,
  });

  // Recipient notification
  await notificationServices.sendSingleNotification(userId, providerId, {
    title: `New Quick support`,
    image:
      user?.profileRole === "BRAND"
        ? user?.BrandInfo?.logoImage
        : user?.IndividualInfo?.profileImage,
    body: `${
      user?.profileRole === "BRAND"
        ? user?.BrandInfo?.brandName
        : user?.IndividualInfo?.fullName
    } has successfully subscribed to your ${amount} `,
  });

  // Admin notifications

  await notificationServices.sendSingleNotification(
    userId,
    "6890552809eee7b6eb0593e3",
    {
      title: `New Quick support`,
      role: "ADMIN",
      image:
        clubORAthleteUser?.profileRole === "ATHLETE"
          ? clubORAthleteUser?.AthleteInfo?.profileImage
          : clubORAthleteUser?.ClubInfo?.logoImage,
      body: `${
        user?.profileRole === "BRAND"
          ? user?.BrandInfo?.brandName
          : user?.IndividualInfo?.fullName
      } successfully subscribed to ${
        clubORAthleteUser?.profileRole === "ATHLETE"
          ? clubORAthleteUser?.AthleteInfo?.fullName
          : clubORAthleteUser?.ClubInfo?.clubName
      } with $${amount}/month. Thank you for your support.`,
    }
  );

  await prisma.transactions.create({
    data: {
      senderId: userId,
      recipientId: providerId,
      amount: amount,
      earningType: "QUICKSUPPORT",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.error(result);
  return {
    amount,
    providerId,
    paymentMethodId,
    userId,
  };
};

const cancelSubscription = async (userId: string, recipientId: string) => {
  // find the subscription in DB
  const subscribedUser = await prisma.subscribedUser.findFirst({
    where: {
      customerId: userId,
      recipientUserId: recipientId,
      subscriptionStatus: "ACTIVE",
    },
  });

  if (!subscribedUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Active subscription not found!");
  }

  // cancel on Stripe immediately
  const subscription = await stripe.subscriptions.cancel(
    subscribedUser.subscriptionId
  );

  // update in DB
  await prisma.subscribedUser.update({
    where: { id: subscribedUser.id },
    data: {
      subscriptionStatus: "CANCELED",
      updatedAt: new Date(),
    },
  });

  return {
    message: "Subscription canceled successfully",
    subscription,
  };
};

export const paymentService = {
  joinTier,
  quickSupport,
  cancelSubscription,
};
