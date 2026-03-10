import { Request, Response } from "express";
import { Event, EventStatus, IEvent } from "./event.Model";
import  cloudinary   from "../../config/cloudinary";  
import { calculateEventStatus } from "../../common/utils/eventStatus";


export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, date, time, location } = req.body;

    if (!title || !description || !date || !time || !location) {
      return res.status(400).json({
        message: "Please provide all required fields.",
      });
    }

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
    
     const status = calculateEventStatus(new Date(date), time, EventStatus.UPCOMING);

    const newEvent: IEvent = new Event({
      imageUrl,
      title,
      description,
      date,
      time,
      location,
      status,
    });

    const savedEvent = await newEvent.save();

    return res.status(201).json({
      success: true,
      data: savedEvent,
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
    const events = await Event.find().sort({ date: 1 });

    const updatedEvents = await Promise.all(
      events.map(async (event) => {
        const newStatus = calculateEventStatus(
          event.date,
          event.time,
          event.status
        );

        if (event.status !== newStatus) {
          event.status = newStatus;
          await event.save();
        }

        return event;
      })
    );

    return res.status(200).json({
      success: true,
      data: updatedEvents,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};



export const updateEvent = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;

    const { title, description, date, time, location } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
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
    if (location) event.location = location;

    event.status = calculateEventStatus(
      event.date,
      event.time,
      event.status
    );

    const updatedEvent = await event.save();

    return res.status(200).json({
      success: true,
      data: updatedEvent,
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

    if(event?.status === EventStatus.FINISHED) {
      return res.status(400).json({ message: "Cannot cancel a finished event" });
    }

    if(event?.status === EventStatus.CANCELLED) {
      return res.status(400).json({ message: "Event is already cancelled" });
    }

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    event.status =  EventStatus.CANCELLED; // ✅ matches enum
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
      status: EventStatus.UPCOMING  , 
    });

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
    });

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
    });

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