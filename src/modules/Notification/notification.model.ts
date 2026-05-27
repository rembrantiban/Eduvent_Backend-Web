import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;

  sender?: mongoose.Types.ObjectId;
  

  eventId?: mongoose.Types.ObjectId;

  data?: {
    screen?: string;
    eventId?: string;
  };

  sentAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
    },

    message: {
      type: String,
      required: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    data: {
      screen: String,
      eventId: String,
    },

    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
    },

    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export const Notification = mongoose.model<INotification>(
  "Notification",
  NotificationSchema
);