import mongoose, { Schema, Document } from "mongoose";

export interface IFaceUser extends Document {
  userId: string;      // student ID or user ID
  name: string;        // full name
  faceToken: string;   // from Face++
  createdAt: Date;
  updatedAt: Date;
}

const FaceUserSchema: Schema = new Schema<IFaceUser>(
  {
    userId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    faceToken: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export const FaceUser = mongoose.model<IFaceUser>(
  "FaceUser",
  FaceUserSchema
);
