import { Request, Response } from "express";
import { Event, IEvent } from "./event.Model";
import  cloudinary   from "../../config/cloudinary";  
import { calculateEventStatus } from "../../common/utils/eventStatus";


export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, date, time, location, status } = req.body;

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
    try{
        const eventId = req.params.id;
        const updatedData = req.body;

        const updateEvent = await Event.findByIdAndUpdate(eventId, updatedData, { new: true });
        if(!updateEvent){
            return res.status(404).json({ message: "Event not found" });
        }

        return res.status(200).json({ success: true, data: updateEvent });
    }
    catch(err){
        return res.status(500).json({ success: false, message: "Internal Server Error"});
    }
}

 export const deleteEvent = async(req: Request, res: Response) => {
     try{
          const eventId = req.params.id;
          const deletedEvent = await Event.findByIdAndDelete(eventId);

          if(!deletedEvent){
             return res.status(404).json({ message: "Event not found" });
          }

            return res.status(200).json({ success: true, message: "Event deleted successfully" });

     }
     catch(err){
        res.status(500).json({ success: false, message: "Internal Server Error"});
        console.error(err, "Error in deleteEvent");

     }
 }