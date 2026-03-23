import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  title: string;
  message: string;

  sender?: mongoose.Types.ObjectId;
  
  targetDepartment: string;

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

    targetDepartment: {
      type: String, 
      required: true,
      default: "All Deparment"
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    data: {
      screen: String,
      eventId: String,
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