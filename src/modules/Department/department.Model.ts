import mongoose, { Schema, Document } from "mongoose";

export interface IDepartment extends Document {
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
    },
  },
  { timestamps: true } 
);

export const Department = mongoose.model<IDepartment>(
  "Department",
  DepartmentSchema
);
