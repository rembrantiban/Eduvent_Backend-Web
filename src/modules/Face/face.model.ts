import mongoose, { Schema, Document } from "mongoose";

export interface IFaceUser extends Document {
  userId: string;
  name: string;
  faceToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const FaceUserSchema = new Schema<IFaceUser>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    faceToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const FaceUser = mongoose.model<IFaceUser>("FaceUser", FaceUserSchema);