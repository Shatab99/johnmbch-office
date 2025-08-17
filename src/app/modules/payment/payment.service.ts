import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../utils/prisma";
import ApiError from "../../error/ApiErrors";
import Stripe from "stripe";
import { stripe } from "../../../config/stripe";
import { createStripeCustomerAcc } from "../../helper/createStripeCustomerAcc";
import { notificationServices } from "../notifications/notification.service";

interface payloadType {
  amount: number;
  paymentMethodId: string;
  paymentMethod?: string;
  bookId: string;
}

const createIntentInStripe = async (payload: payloadType, userId: string) => {
  const findUser = await prisma.user.findUnique({ where: { id: userId } });

  if (findUser?.customerId === null) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found!");
  }

  await stripe.paymentMethods.attach(payload.paymentMethodId, {
    customer: findUser?.customerId || "",
  });

  const payment = await stripe.paymentIntents.create({
    amount: Math.round(payload.amount * 100),
    currency: payload?.paymentMethod || "usd",
    payment_method: payload.paymentMethodId,
    customer: findUser?.customerId as string,
    confirm: true,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
  });

  console.log(payment);

  if (payment.status !== "succeeded") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Payment failed");
  }

  await prisma.payment.create({
    data: {
      userId: userId,
      amount: payload.amount,
      paymentMethod: payload.paymentMethod,
      serviceId: payload.bookId,
    },
  });

  return;
};

const saveCardInStripe = async (payload: {
  paymentMethodId: string;
  cardholderName?: string;
  userId: string;
}) => {
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw new ApiError(404, "User not found!");
  }
  const { paymentMethodId, cardholderName } = payload;
  let customerId = user.customerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email as string,
      payment_method: paymentMethodId,
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
    customerId = customer.id;
    await prisma.user.update({
      where: { id: payload.userId },
      data: { customerId },
    });
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });

  const newCard: any = await stripe.paymentMethods.retrieve(paymentMethodId);

  const existingCard = paymentMethods.data.find(
    (card: any) => card.card.last4 === newCard.card.last4
  );

  if (existingCard) {
    throw new ApiError(409, "This card is already saved.");
  } else {
    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
    await stripe.paymentMethods.update(paymentMethodId, {
      billing_details: {
        name: cardholderName,
      },
    });
    return {
      message: "Customer created and card saved successfully",
    };
  }
};

const getSaveCardsFromStripe = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found!");
  }

  const saveCard = await stripe.paymentMethods.list({
    customer: user?.customerId || "",
    type: "card",
  });

  const cardDetails = saveCard.data.map((card: Stripe.PaymentMethod) => {
    return {
      id: card.id,
      brand: card.card?.brand,
      last4: card.card?.last4,
      type: card.card?.checks?.cvc_check === "pass" ? "valid" : "invalid",
      exp_month: card.card?.exp_month,
      exp_year: card.card?.exp_year,
      billing_details: card.billing_details,
    };
  });

  return cardDetails;
};

const deleteCardFromStripe = async (userId: string, last4: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(404, "User not found!");
  }
  if (!user.customerId) {
    throw new ApiError(404, "Card is not saved");
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: user.customerId,
    type: "card",
  });
  const card = paymentMethods.data.find(
    (card: any) => card.card.last4 === last4
  );
  if (!card) {
    throw new ApiError(404, "Card not found!");
  }
  await stripe.paymentMethods.detach(card.id);
};

const transferAmountFromStripe = async (payload: {
  amount: number;
  connectAccountId: string;
}) => {
  const transfer = await stripe.transfers.create({
    amount: Math.round(payload.amount * 0.92 * 100),
    currency: "usd",
    destination: payload.connectAccountId, // Connect account ID
    source_type: "card",
  });

  return transfer;
};

const refundPaymentFromStripe = async (id: string) => {
  const findPayment = await prisma.payment.findUnique({
    where: {
      serviceId: id,
    },
  });
  if (!findPayment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Payment not found!");
  }

  const payment = await stripe.refunds.create({
    payment_intent: findPayment?.paymentId || "",
    amount: Math.round(findPayment.amount * 100), // Amount in cents
  });
  return payment;
};

const subscribeToPlanFromStripe = async (payload: {
  subscriptionId: string;
  userId: string;
  paymentMethodId: string;
}) => {
  const findUser = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
  });
  if (!findUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found!");
  }

  if (findUser?.customerId === null) {
    await createStripeCustomerAcc(findUser);
  }

  const findSubscription = await prisma.subscription.findUnique({
    where: {
      id: payload.subscriptionId,
    },
  });
  if (!findSubscription) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Subscription not found!");
  }

  await stripe.paymentMethods.attach(payload.paymentMethodId, {
    customer: findUser.customerId as string,
  });

  await stripe.customers.update(findUser.customerId as string, {
    invoice_settings: {
      default_payment_method: payload.paymentMethodId,
    },
  });

  const purchasePlan = (await stripe.subscriptions.create({
    customer: findUser.customerId as string,
    items: [{ price: findSubscription.stripePriceId }],
  })) as any;

  const subscriptionItem = purchasePlan.items.data[0];

  const updateUserPlan = await prisma.subscriptionUser.upsert({
    where: {
      userId: payload.userId,
    },
    update: {
      subscriptionPlanId: payload?.subscriptionId, // or map to your internal plan name
      subscriptionId: purchasePlan?.id,
      subscriptionStatus: purchasePlan.status,
      subscriptionStart: new Date(subscriptionItem.current_period_start * 1000),
      subscriptionEnd: new Date(subscriptionItem.current_period_end * 1000),
    },
    create: {
      userId: payload.userId,
      subscriptionPlanId: payload?.subscriptionId, // or map to your internal plan name
      subscriptionId: purchasePlan?.id,
      subscriptionStatus: purchasePlan.status,
      subscriptionStart: new Date(subscriptionItem.current_period_start * 1000),
      subscriptionEnd: new Date(subscriptionItem.current_period_end * 1000),
    },
  });

  //   await prisma.user.update({
  //     where: {
  //       id: payload.userId,
  //     },
  //     data: {
  //       subscriptionPlan:
  //         findSubscription.name.split(" ")[0] == "Basic" ? "BASIC" : "PRO",
  //     },
  //   });

  return updateUserPlan;
};

const cancelSubscriptionFromStripe = async (payload: { userId: string }) => {
  const findUser = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
    include: {
      SubscriptionUser: true, // assuming relation name is `subscriptionDetails`
    },
  });

  if (!findUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found!");
  }

  if (!findUser.SubscriptionUser?.subscriptionId) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "User does not have an active subscription!"
    );
  }

  // Cancel the subscription at Stripe
  const cancelledSubscription = await stripe.subscriptions.update(
    findUser.SubscriptionUser?.subscriptionId as string,
    {
      cancel_at_period_end: true, // Cancels at end of current billing period
    }
  );

  // Update DB with status
  const updateUserSubscription = await prisma.subscriptionUser.update({
    where: {
      userId: payload.userId,
    },
    data: {
      subscriptionStatus: cancelledSubscription.status, // should be "active" but set to cancel later
    },
  });

  return cancelledSubscription;
};

const splitPaymentFromStripe = async (payload: {
  amount: number;
  paymentMethodId: string;
  providerId: string;
  paymentMethod?: string;
}) => {
  const finderUser = await prisma.user.findUnique({
    where: { id: payload.providerId },
  });

  if (finderUser?.connectAccountId === null) {
    throw new ApiError(
      StatusCodes.NOT_FOUND,
      "This user is not connected to Stripe !"
    );
  }
  const payment = await stripe.paymentIntents.create({
    amount: Math.round(payload.amount * 100),
    currency: payload?.paymentMethod || "usd",
    payment_method: payload.paymentMethodId,
    confirm: true,
    payment_method_types: ["card"], // 🔥 Important: to avoid auto-redirects or default behavior
    application_fee_amount: Math.round(payload.amount * 0.1 * 100), // $7 in cents , 10% here
    transfer_data: {
      destination: finderUser?.connectAccountId as string,
    },
  });

  if (payment.status !== "succeeded") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Payment failed!");
  }

  return payment;
};

const joinTier = async (userId: string, body: any, files: any) => {
  const image = files.banner?.[0]?.location;
  const {
    tierId,
    clubOrPlayerUserId: providerId,
    content,
    paymentMethodId,
  } = body;

  const tier = await prisma.tier.findUnique({
    where: { id: tierId },
  });

  if (!tier) throw new ApiError(StatusCodes.NOT_FOUND, "Tier not found!");
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new ApiError(StatusCodes.NOT_FOUND, "User not found!");
  if (tier.type !== user.profileRole)
    throw new ApiError(StatusCodes.FORBIDDEN, "User is not a brand!");
  if (user.profileRole !== tier.type)
    throw new ApiError(StatusCodes.FORBIDDEN, "User is not an individual!");

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

  const paymentdata = {
    providerId,
    paymentMethodId,
    amount: tier.amount,
    paymentMethod: "usd",
  };

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

  await splitPaymentFromStripe(paymentdata);

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

  //create room for chat

  await prisma.room.create({
    data: {
      senderId: userId,
      receiverId: providerId,
    },
  });

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

  const message = `Successfully ${
    tier.type === "BRAND" ? "sponsored" : "supported"
  } tier on ${
    clubORAthleteUser?.profileRole === "CLUB"
      ? clubORAthleteUser.ClubInfo?.clubName
      : clubORAthleteUser?.AthleteInfo?.fullName
  } profile`;

  return message;
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

  const clubORAthleteUser = await prisma.user.findUnique({
    where: { id: providerId, status: "ACTIVE" },
    include: {
      AthleteInfo: true,
      ClubInfo: true,
    },
  });

  if (!clubORAthleteUser)
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found!");

  await splitPaymentFromStripe(paymentdata);

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
};

export const paymentService = {
  createIntentInStripe,
  saveCardInStripe,
  getSaveCardsFromStripe,
  deleteCardFromStripe,
  splitPaymentFromStripe,
  transferAmountFromStripe,
  refundPaymentFromStripe,
  subscribeToPlanFromStripe,
  cancelSubscriptionFromStripe,
  joinTier,
  quickSupport,
};
