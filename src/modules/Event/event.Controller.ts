import { Request, Response } from "express";
import { Event, EventStatus, IEvent } from "./event.Model";
import cloudinary from "../../config/cloudinary";
import { calculateEventStatus } from "../../common/utils/eventStatus";
import mongoose from "mongoose";


export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, date, time, locationId } = req.body;

    if (!title || !description || !date || !time || !locationId) {
      return res.status(400).json({
        message: "Please provide all required fields.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({
        message: "Invalid locationId.",
      });
    }

    const parseDate = new Date(date);
    parseDate.setHours(0, 0, 0, 0);

    let imageUrl: string | undefined;

    if (req.file) {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "events",
              resource_type: "image",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(req.file!.buffer);
      });

      imageUrl = uploadResult.secure_url;
    }

    const status = calculateEventStatus(parseDate, time, EventStatus.UPCOMING); 
    
    const newEvent: IEvent = new Event({
      imageUrl,
      title,
      description,
      date: parseDate,
      time,
      locationId,
      status,
    });

    const savedEvent = await newEvent.save();
    const populatedEvent = await savedEvent.populate("locationId");

    return res.status(201).json({
      success: true,
      data: populatedEvent,
    });
  } catch (err) {
    console.error(err, "Error in createEvent");
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getEvents = async (req: Request, res: Response) => {
  try {
    const events = await Event.find()
      .populate("locationId")
      .sort({ createdAt: -1 });

    const computedEvents = events.map((event) => {
  const [hours, minutes] = event.time.split(":").map(Number);

  const eventStart = new Date(
    event.date.getFullYear(),
    event.date.getMonth(),
    event.date.getDate(),
    hours,
    minutes,
    0,
    0
  );

  const eventEnd = new Date(eventStart);
  eventEnd.setHours(eventEnd.getHours() + 2);

  const now = new Date();

  let status = EventStatus.UPCOMING;

  if (event.status === EventStatus.CANCELLED) {
    status = EventStatus.CANCELLED;
  } else if (now >= eventStart && now <= eventEnd) {
    status = EventStatus.ONGOING;
  } else if (now > eventEnd) {
    status = EventStatus.FINISHED;
  }

  return {
    ...event.toObject(),
    status,
  };
});

    return res.status(200).json({
      success: true,
      data: computedEvents,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;

    const { title, description, date, time, locationId } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (locationId && !mongoose.Types.ObjectId.isValid(locationId)) {
      return res.status(400).json({
        message: "Invalid locationId.",
      });
    }

    if (req.file) {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "events",
              resource_type: "image",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(req.file!.buffer);
      });

      event.imageUrl = uploadResult.secure_url;
    }

    if (title) event.title = title;
    if (description) event.description = description;
    if (date) event.date = new Date(date);
    if (time) event.time = time;
    if (locationId) event.locationId = locationId;

    event.status = calculateEventStatus(
      event.date,
      event.time,
      event.status
    );

    const updatedEvent = await event.save();
    const populatedEvent = await updatedEvent.populate("locationId");

    return res.status(200).json({
      success: true,
      data: populatedEvent,
    });
  } catch (err) {
    console.error("Error in updateEvent", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


// delete Controller Component

const getPublicIdFromUrl = (url: string): string | null => {
  try {
    const parts = url.split("/");
    const uploadIndex = parts.findIndex((p) => p === "upload");
    if (uploadIndex === -1) return null;

    // Skip "upload" and version (v123456)
    const publicIdWithExt = parts
      .slice(uploadIndex + 2)
      .join("/")
      .split(".")[0];

    return publicIdWithExt;
  } catch {
    return null;
  }
};


export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.imageUrl) {
      const publicId = getPublicIdFromUrl(event.imageUrl);

      if (publicId) {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: "image",
        });
      }
    }

    await event.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Event and image deleted successfully",
    });
  } catch (err) {
    console.error("Error in deleteEvent", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


export const updateEventStatusToCanceled = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findById(eventId);

    if (event?.status === EventStatus.FINISHED) {
      return res.status(400).json({ message: "Cannot cancel a finished event" });
    }

    if (event?.status === EventStatus.CANCELLED) {
      return res.status(400).json({ message: "Event is already cancelled" });
    }

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    event.status = EventStatus.CANCELLED; // ✅ matches enum
    await event.save();

    return res.status(200).json({
      success: true,
      message: "Event status updated to Cancelled",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getUpComingEvents = async (req: Request, res: Response) => {
  try {
    const upComingEvents = await Event.find({
      status: EventStatus.UPCOMING,
    }).populate("locationId");

    return res.status(200).json({
      success: true,
      data: upComingEvents,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


export const getFinishedEvents = async (req: Request, res: Response) => {
  try {
    const finishedEvents = await Event.find({
      status: EventStatus.FINISHED,
    }).populate("locationId");

    return res.status(200).json({
      success: true,
      data: finishedEvents,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export const getTotalUpComingEvents = async (req: Request, res: Response) => {
  try {
    const upComingEvents = await Event.find({
      status: EventStatus.UPCOMING,
    }).populate("locationId");

    return res.status(200).json({
      success: true,
      data: upComingEvents,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}