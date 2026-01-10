import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "admin" | "teacher" | "student";

export interface IUser extends Document {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
  // Student-specific fields
  studentId?: string;
  yearLevel?: string;
  department?: string;
  section?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema<IUser>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "teacher", "student"], default: "student" },

     // unique only if exists
    studentId: { type: String, unique: true, sparse: true },
    yearLevel: { type: String },
    department: { type: String },
    section: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>("User", UserSchema);
