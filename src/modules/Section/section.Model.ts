import mongoose, { Schema, Document } from "mongoose";

export interface ISection extends Document {
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema(
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

export const Section = mongoose.model<ISection>(
  "Section",
  SectionSchema
);
