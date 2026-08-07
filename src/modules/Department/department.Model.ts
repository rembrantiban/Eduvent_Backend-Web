import mongoose, { Schema, Document } from "mongoose";

export interface IMajor {
  name: string;
}

export interface ICourse extends Document {
  name: string;
  description: string;
  majors: IMajor[];
  createdAt: Date;
  updatedAt: Date;
}

const MajorSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const CourseSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    majors: {
      type: [MajorSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export const Course = mongoose.model<ICourse>(
  "Course",
  CourseSchema
);