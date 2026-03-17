import mongoose, { Document, Schema } from "mongoose";

export interface ILocation extends Document {
  venue: string;
  location: string;
  latitude: number;
  longitude: number;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    venue: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
      unique: true
    },
    
    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true, 
  }
);

 LocationSchema.index({ venue: 1, location: 1 }, { unique: true })

export const Location = mongoose.model<ILocation>(
  "Location",
  LocationSchema
);
