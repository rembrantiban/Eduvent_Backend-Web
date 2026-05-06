import mongoose, { Schema, Document } from "mongoose";

export interface IMajor {
  name: string;
}

export interface IDepartment extends Document {
  code: string;
  name: string;
  description: string;
  majors: IMajor[];
  createdAt: Date;
  updatedAt: Date;
}

const MajorSchema = new Schema<IMajor>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const DepartmentSchema = new Schema<IDepartment>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },

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
  { timestamps: true }
);

export const Department = mongoose.model<IDepartment>(
  "Department",
  DepartmentSchema
);