import mongoose, {
  Schema,
  Document,
} from "mongoose";

export enum EventStatus {
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

  endTime: string;

  status: EventStatus;

  /* TARGETING */
  targetDepartments?: string[];

  targetYearLevels?: string[];

  targetMajors?: string[];

  targetSections?: string[];

  isForAllStudents: boolean;

  locationId: mongoose.Types.ObjectId;

  createdAt: Date;

  updatedAt: Date;
}

const EventSchema: Schema = new Schema<IEvent>(
  {
    imageUrl: {
      type: String,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    time: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: Object.values(EventStatus),
      default: EventStatus.UPCOMING,
      required: true,
    },

    targetDepartments: {
      type: [String],
      default: [],
    },

    targetYearLevels: {
      type: [String],
      default: [],
    },

    targetMajors: {
      type: [String],
      default: [],
    },

    targetSections: {
      type: [String],
      default: [],
    },

    isForAllStudents: {
      type: Boolean,
      default: false,
    },

    locationId: {
      type: mongoose.Types.ObjectId,
      ref: "Location",
      required: true,
    },
  },
  { timestamps: true }
);

export const Event = mongoose.model<IEvent>(
  "Event",
  EventSchema
);