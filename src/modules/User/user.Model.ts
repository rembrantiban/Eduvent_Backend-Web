import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "admin" | "CSSG_Adviser" | "student" | "CSSG_officer" | "Saso";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  avatar: string;

  // Soft delete — deleted accounts are hidden everywhere but can be restored
  isDeleted: boolean;
  deletedAt?: Date | null;
  deletedBy?: mongoose.Types.ObjectId | null;
  //face Register 

  isFaceRegistered: boolean,

   pushToken?: string;

  // Set automatically on mobile login to mark this account as mobile-enabled
  locationToken?: boolean;
  cameraToken?: boolean;

  // Student-specific fields
  studentId?: string;
  yearLevel?: string;
  course?: string;
  major: string;
  section?: string;
  gender?: "Male" | "Female";
  createdAt: Date;
  updatedAt: Date;
  resetPasswordCode?: string;
  resetPasswordExpires?: Date;
  resetPasswordVerified?: boolean;

}

const UserSchema: Schema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "CSSG_Adviser","CSSG_officer", "Saso", "student"], default: "student" },
    isActive: { type: Boolean, default: true },
    avatar: { type: String, default: null },

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },


    isFaceRegistered:{ type: Boolean, default: false },


    pushToken: {
      type: String,
      default: null,
    },

    locationToken: {
      type: Boolean,
      default: false,
    },
    cameraToken: {
      type: Boolean,
      default: false,
    },

    // reset password fields
    resetPasswordCode: { type: String },
    resetPasswordExpires: { type: Date },
    resetPasswordVerified: { type: Boolean, default: false },

     // unique only if exists
    studentId: { type: String, unique: true, sparse: true },
    yearLevel: { type: String },
    course: { type: String },
    major: { type: String },
    section: { type: String },
    gender: { type: String, enum: ["Male", "Female"] },
  },
  { timestamps: true }
);

/** Query filter for accounts that have not been soft-deleted (older docs have no isDeleted field). */
export const NOT_DELETED = { isDeleted: { $ne: true } } as const;

export const User = mongoose.model<IUser>("User", UserSchema);
