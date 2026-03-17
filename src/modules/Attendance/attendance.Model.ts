import mongoose, { Schema, Document } from "mongoose";

export interface IAttendance extends Document {
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  faceToken: string;
  status: "Present" | "Late";
  confidence: number;
  timeRecorded: Date;
  imageUrl?: string;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    faceToken: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Present", "Late"],
      required: true,
    },

    confidence: {
      type: Number,
      required: true,
    },

    timeRecorded: {
      type: Date,
      default: Date.now,
    },

    imageUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
);

AttendanceSchema.index(
  { eventId: 1, userId: 1 },
  { unique: true }
);

export const Attendance = mongoose.model<IAttendance>(
  "Attendance",
  AttendanceSchema
);