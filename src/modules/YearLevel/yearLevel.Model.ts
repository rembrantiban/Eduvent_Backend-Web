import mongoose, { Schema, Document } from "mongoose";

export interface IYearLevel extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const YearLevelSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

export const YearLevel = mongoose.model<IYearLevel>(
  "YearLevel",
  YearLevelSchema
);
