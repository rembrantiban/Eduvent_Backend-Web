import mongoose, { Schema } from "mongoose";

const AttendanceSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["present", "late"],
      default: "present",
    },
    method: {
      type: String,
      enum: ["manual", "qr", "face"],
      default: "manual",
    },
    timeIn: {
      type: Date,
      default: null,
    },
    timeOut: {
      type: Date,
      default: null,
    },
    checkedInAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

/* 🔥 THIS IS THE PRIMARY KEY LOGIC */
AttendanceSchema.index(
  { eventId: 1, studentId: 1 },
  { unique: true }
);

export default mongoose.model("Attendance", AttendanceSchema);