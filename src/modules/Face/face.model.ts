import mongoose, {
  Schema,
  Document,
} from "mongoose";

export interface IFaceUser
  extends Document {

  userId: string;

  name: string;

  faceUrl: string;

  cloudinaryId: string;

  createdAt: Date;

  updatedAt: Date;
}

const FaceUserSchema =
  new Schema<IFaceUser>(
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

      faceUrl: {
        type: String,
        required: true,
      },

      cloudinaryId: {
        type: String,
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

export const FaceUser =
  mongoose.model<IFaceUser>(
    "FaceUser",
    FaceUserSchema
  );