import nodemailer from "nodemailer";
import { prisma } from "../../utils/prisma";

export const sendEmailFn = async (email: string, otp: number) => {
  const findUser = await prisma.user.findUnique({
    where: { email }, include: {
      AthleteInfo: true,
      ClubInfo: true,
      BrandInfo: true,
    }
  });

  if (!findUser) throw new Error("User not found with provided email");

  const adminEmail = process.env.ADMIN_MAIL;
  const mailPass = process.env.MAIL_PASS;
  const companyName = process.env.COMPANY_NAME || "Your Company";

  if (!adminEmail || !mailPass) {
    throw new Error("Email credentials not found in environment variables");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: adminEmail,
      pass: mailPass,
    },
  });

  const mailOptions = {
    from: `"No Reply" <${adminEmail}>`,
    to: email,
    subject: "Your OTP Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 30px; border-radius: 12px; background: #fff; border: 1px solid #ddd;">
        <h2 style="color: #2c3e50;">🔐 One-Time Password (OTP)</h2>
        <p>Hello ${findUser.AthleteInfo?.fullName || findUser.ClubInfo?.clubName || findUser.BrandInfo?.brandName || "User"},</p>
        <p>Your one-time password (OTP) is:</p>
        <div style="margin: 20px 0; text-align: center;">
          <span style="font-size: 26px; font-weight: bold; padding: 10px 20px; border: 2px dashed #3498db; border-radius: 8px; background: #ecf5fc;">
            ${otp}
          </span>
        </div>
        <p>Please enter this code within <strong>5 minutes</strong>.</p>
        <p>If you didn’t request this, you can ignore it.</p>
        <hr style="margin: 30px 0;">
        <p>— ${companyName} Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
