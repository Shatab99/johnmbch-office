import { StatusCodes } from "http-status-codes";
import { stripe } from "../../config/stripe";
import { prisma } from "../../utils/prisma";
import ApiError from "../error/ApiErrors";
import { StripeConnectAccEmail } from "./StripeConnectAccEmail";

export const createStripeConnectAccount = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found!");

  let accountId = user.connectAccountId;

  // 1. Create account if not exists
  if (!accountId && user.email) {
    const stripeAccount = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user.email,
      metadata: { userId },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    accountId = stripeAccount.id;

    await prisma.user.update({
      where: { id: userId },
      data: { connectAccountId: accountId },
    });
  }

  // 2. Always create onboarding link if details are not submitted
  const account = await stripe.accounts.retrieve(accountId!);

  if (!account.details_submitted || !account.charges_enabled) {
    const accountLink = await stripe.accountLinks.create({
      account: accountId!,
      refresh_url: "https://success-page-xi.vercel.app/not-success",
      return_url: "https://success-page-xi.vercel.app/success",
      type: "account_onboarding",
    });

    // send email or return URL to user

    await StripeConnectAccEmail(user);
    return {
      message: "Please complete Stripe onboarding",
      onboardingUrl: accountLink.url,
    };
  }

  return { message: "Stripe account is already active", accountId };
};
