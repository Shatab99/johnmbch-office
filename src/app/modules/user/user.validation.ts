import { count, profile } from "console";
import { z } from "zod";

const createValidation = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  // .regex(/[a-zA-Z0-9]/, "Password must contain only letters and numbers")
});

const changePasswordValidation = z.object({
  oldPassword: z.string().min(8, "Password must be at least 8 characters long"),
  newPassword: z.string().min(8, "Password must be at least 8 characters long"),
});

// All user validation schemas can be exported from here

const updateAtheleteProfileValidation = z.object({
  profileRole: z.string(),
  fullName: z.string().min(1, "Full name is required"),
  sportName: z.string().min(1, "Sport name is required"),
  bio: z.string(),
  clubName: z.string(),
  position: z.string(),
  country: z.string(),
  city: z.string(),
  // otp: z.string(),
});

const updateClubProfileValidation = z.object({
  profileRole: z.string(),
  clubName: z.string().min(1, "Club name is required"),
  bio: z.string(),
  country: z.string(),
  city: z.string(),
  sportName: z.string(),
  members: z.number().min(0, "Members must be a positive number"),
  foundedYear: z.string().min(4, "Founded year is required"),
  // otp: z.string(),
});

const updatebrandProfileValidation = z.object({
  profileRole: z.string(),
  brandName: z.string().min(1, "Brand name is required"),
  country: z.string(),
  city: z.string(),
  // otp: z.string(),
});

const updateIndividualProfileValidation = z.object({
  profileRole: z.string(),
  fullName: z.string().min(1, "Full name is required"),
  country: z.string(),
  city: z.string(),
  // otp: z.string(),
});

export const UserValidation = {
  createValidation,
  changePasswordValidation,
  updateAtheleteProfileValidation,
  updateClubProfileValidation,
  updatebrandProfileValidation,
  updateIndividualProfileValidation,
};
