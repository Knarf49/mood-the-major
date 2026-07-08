import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin";
  isVerified: boolean;
  verificationCodeHash?: string | undefined;
  verificationExpires?: Date | undefined;
  resetPasswordCodeHash?: string | undefined;
  resetPasswordExpires?: Date | undefined;
  createdAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    passwordHash: { type: String, required: true, select: false }, // excluded from queries by default
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    verificationCodeHash: { type: String, select: false },
    verificationExpires: { type: Date, select: false },
    resetPasswordCodeHash: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
  // no toJSON.transform — allowlist happens explicitly via UserDTO() in dto.ts
);

export const User = model<IUser>("User", userSchema);
