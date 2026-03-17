import mongoose , { Schema, Document } from "mongoose";


export enum EventStatus{
    UPCOMING = "Upcoming",
    ONGOING = "Ongoing",
    FINISHED = "Finished",
    CANCELLED = "Cancelled",
}

export interface IEvent extends Document { 
    imageUrl?: string;
    title: string;
    description: string;
    date: Date;
    time: string;
    status: EventStatus;
    locationId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const EventSchema: Schema = new Schema<IEvent>(
    {
        imageUrl: { type: String },
        title: { type: String, required: true },
        description: { type: String, required: true },
        date: { type: Date, required: true },
        time: { type: String, required: true },
       status: {
      type: String,
        enum: Object.values(EventStatus),
        default: EventStatus.UPCOMING,
        required: true,
        },
        locationId: { type: mongoose.Types.ObjectId, ref: "Location", required: true },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export const Event = mongoose.model<IEvent>("Event", EventSchema);

