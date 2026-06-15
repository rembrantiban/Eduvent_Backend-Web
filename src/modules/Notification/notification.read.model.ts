import mongoose, { Schema, Document } from "mongoose";

export interface INotificationRead extends Document {
  notificationId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  readAt: Date;
}

const NotificationReadSchema = new Schema<INotificationRead>(
  {
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate read records
NotificationReadSchema.index(
  { notificationId: 1, userId: 1 },
  { unique: true }
);

export const NotificationRead = mongoose.model<INotificationRead>(
  "NotificationRead",
  NotificationReadSchema
);