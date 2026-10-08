import { Request, Response } from "express";
import { Event, EventStatus, IEvent, NOT_DELETED } from "./event.Model";
import cloudinary from "../../config/cloudinary";
import mongoose from "mongoose";
import { AnyBulkWriteOperation } from "mongoose";
import { isPastCloseTime } from "../../common/utils/attendanceWindow";
import { notifyEventCreated } from "../Notification/notification.service";


const parseAttendanceRules = (
  lateRaw: unknown,
  closeRaw: unknown
): { late: number; close: number } | { error: string } => {
  const late =
    lateRaw === undefined || lateRaw === ""
      ? 15
      : Number(lateRaw);

  const close =
    closeRaw === undefined || closeRaw === ""
      ? 0
      : Number(closeRaw);

  if (
    !Number.isInteger(late) ||
    late < 0 ||
    !Number.isInteger(close) ||
    close < 0
  ) {
    return {
      error:
        "Late threshold and attendance close time must be whole numbers of minutes (0 or more).",
    };
  }

  return { late, close };
};

export const createEvent = async (
  req: Request,
  res: Response
) => {
  const parsedTargetDepartments =
    typeof req.body.targetDepartments === "string"
      ? JSON.parse(req.body.targetDepartments)
      : [];

  const parsedTargetMajors =
    typeof req.body.targetMajors === "string"
      ? JSON.parse(req.body.targetMajors)
      : [];

  const parsedTargetYearLevels =
    typeof req.body.targetYearLevels === "string"
      ? JSON.parse(req.body.targetYearLevels)
      : [];

  const parsedTargetSections =
    typeof req.body.targetSections === "string"
      ? JSON.parse(req.body.targetSections)
      : [];

  try {
    const {
      title,
      description,
      date,
      time,
      endTime,
      locationId,
      lateThresholdMinutes,
      attendanceCloseAfterMinutes,

      /* NEW */
      targetDepartments,
      targetYearLevels,
      targetMajors,
      targetSections,
      isForAllStudents,
    } = req.body;

    if (
      !title ||
      !description ||
      !date ||
      !time ||
      !locationId
    ) {
      return res.status(400).json({
        message:
          "Please provide all required fields.",
      });
    }

    if (
      !mongoose.Types.ObjectId.isValid(
        locationId
      )
    ) {
      return res.status(400).json({
        message: "Invalid locationId.",
      });
    }

    const parseDate = new Date(date);

    parseDate.setHours(0, 0, 0, 0);

    if (time === endTime) {
      return res.status(400).json({
        message:
          "Start time and end time cannot be the same.",
      });
    }

    const attendanceRules = parseAttendanceRules(
      lateThresholdMinutes,
      attendanceCloseAfterMinutes
    );

    if ("error" in attendanceRules) {
      return res.status(400).json({
        message: attendanceRules.error,
      });
    }

    let imageUrl: string | undefined;

    if (req.file) {
      const uploadResult =
        await new Promise<any>(
          (resolve, reject) => {
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
          }
        );

      imageUrl = uploadResult.secure_url;
    }

    const now = new Date(
      new Date().toLocaleString(
        "en-US",
        {
          timeZone: "Asia/Manila",
        }
      )
    );

    const safeParseTime = (t?: string) => {
      if (!t || !t.includes(":"))
        return [0, 0];

      return t.split(":").map(Number);
    };

    const [startH, startM] =
      safeParseTime(time);

    let [endH, endM] =
      safeParseTime(endTime);

    if (!endTime) {
      endH = startH + 1;
      endM = startM;
    }

    const eventStart = new Date(
      parseDate.getFullYear(),
      parseDate.getMonth(),
      parseDate.getDate(),
      startH,
      startM
    );

    const eventEnd = new Date(
      parseDate.getFullYear(),
      parseDate.getMonth(),
      parseDate.getDate(),
      endH,
      endM
    );

    if (eventEnd < eventStart) {
      eventEnd.setDate(
        eventEnd.getDate() + 1
      );
    }

    let status = EventStatus.UPCOMING;

    if (now < eventStart) {
      status = EventStatus.UPCOMING;
    } else if (now <= eventEnd) {
      status = EventStatus.ONGOING;
    } else {
      status = EventStatus.FINISHED;
    }

    const newEvent: IEvent = new Event({
      imageUrl,
      title,
      description,
      date: parseDate,
      time,
      endTime,
      locationId,
      lateThresholdMinutes:
        attendanceRules.late,
      attendanceCloseAfterMinutes:
        attendanceRules.close,
      status,

      /* NEW TARGETING */
      targetDepartments:
        parsedTargetDepartments,

      targetYearLevels:
        parsedTargetYearLevels,

      targetMajors:
        parsedTargetMajors,

      targetSections:
        parsedTargetSections,

      isForAllStudents:
        isForAllStudents === "true",
    });

    const savedEvent =
      await newEvent.save();

    const populatedEvent =
      await savedEvent.populate(
        "locationId"
      );

    /* Notify eligible participants in the background so a push failure never blocks creation */
    notifyEventCreated(
      savedEvent,
      req.user?._id,
      req.user ? `${req.user.firstName} ${req.user.lastName}` : undefined
    ).catch((err) =>
      console.error(err, "Error notifying event participants")
    );

    return res.status(201).json({
      success: true,
      data: populatedEvent,
    });
  } catch (err) {
    console.error(
      err,
      "Error in createEvent"
    );

    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getEvents = async (req: Request, res: Response) => {
  try {
    // ?deleted=true lists the soft-deleted events (for the restore view)
    if (req.query.deleted === "true") {
      const deletedEvents = await Event.find({ isDeleted: true })
        .populate("locationId")
        .sort({ deletedAt: -1 });

      return res.status(200).json({
        success: true,
        data: deletedEvents,
      });
    }

    const events = await Event.find(NOT_DELETED)
      .populate("locationId")
      .sort({ createdAt: -1 });

    const bulkOps: AnyBulkWriteOperation<IEvent>[] = [];

    const now = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
    );

    const updatedEvents = events.map((event) => {
      let startH = 0, startM = 0;
      let endH = 0, endM = 0;

      if (event.time && event.time.includes(":")) {
        [startH, startM] = event.time.split(":").map(Number);
      }

      if (event.endTime && event.endTime.includes(":")) {
        [endH, endM] = event.endTime.split(":").map(Number);
      } else {
        endH = startH + 1;
        endM = startM;
      }

      const eventStart = new Date(
        event.date.getFullYear(),
        event.date.getMonth(),
        event.date.getDate(),
        startH,
        startM,
        0,
        0
      );

      const eventEnd = new Date(
        event.date.getFullYear(),
        event.date.getMonth(),
        event.date.getDate(),
        endH,
        endM,
        0,
        0
      );

      let newStatus = EventStatus.UPCOMING;

      if (event.status === EventStatus.CANCELLED) {
        newStatus = EventStatus.CANCELLED;
      } else if (now >= eventStart && now <= eventEnd) {
        newStatus = EventStatus.ONGOING;
      } else if (now > eventEnd) {
        newStatus = EventStatus.FINISHED;
      }

      if (event.status !== newStatus) {
        bulkOps.push({
          updateOne: {
            filter: { _id: event._id },
            update: { status: newStatus },
          },
        });

        event.status = newStatus;
      }

      return event;
    });

    if (bulkOps.length > 0) {
      await Event.bulkWrite(bulkOps);
    }

    return res.status(200).json({
      success: true,
      data: updatedEvents,
    });

  } catch (err) {
    console.error("Error in getEvents:", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getStudentEvents = async (
  req: Request,
  res: Response
) => {

  try {

    const user = req.user;

    if (!user) {

      return res.status(401).json({
        message: "Unauthorized",
      });

    }

    const events = await Event.find({

      ...NOT_DELETED,

      $or: [

        {
          isForAllStudents: true,
        },

        {
          targetDepartments: {
            $in: [user.course],
          },
        },

        {
          targetMajors: {
            $in: [user.major],
          },
        },

        {
          targetYearLevels: {
            $in: [user.yearLevel],
          },
        },

        {
          targetSections: {
            $in: [user.section],
          },
        },

      ],

    })

      .select(`
        title
        description
        date
        time
        endTime
        lateThresholdMinutes
        attendanceCloseAfterMinutes
        isClosed
        status
        imageUrl
        locationId
      `)

      .populate({
        path: "locationId",
        select: `
    venue
    location
    latitude
    longitude
  `,
      })

      .sort({
        date: 1,
      })

      .lean();
    return res.status(200).json({

      success: true,

      data: events,

    });

  } catch (error) {

    console.error(
      "Error fetching student events",
      error
    );

    return res.status(500).json({
      message: "Server error",
    });

  }

};

export const updateEvent = async (
  req: Request,
  res: Response
) => {

  const parsedTargetDepartments =
    typeof req.body.targetDepartments === "string"
      ? JSON.parse(req.body.targetDepartments)
      : [];

  const parsedTargetMajors =
    typeof req.body.targetMajors === "string"
      ? JSON.parse(req.body.targetMajors)
      : [];

  const parsedTargetYearLevels =
    typeof req.body.targetYearLevels === "string"
      ? JSON.parse(req.body.targetYearLevels)
      : [];

  const parsedTargetSections =
    typeof req.body.targetSections === "string"
      ? JSON.parse(req.body.targetSections)
      : [];

  try {
    const eventId = req.params.id;

    const {
      title,
      description,
      date,
      time,
      endTime,
      locationId,
      lateThresholdMinutes,
      attendanceCloseAfterMinutes,

      /* NEW */
      targetDepartments,
      targetYearLevels,
      targetMajors,
      targetSections,
      isForAllStudents,
    } = req.body;

    const event = await Event.findOne({ _id: eventId, ...NOT_DELETED });

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (
      locationId &&
      !mongoose.Types.ObjectId.isValid(
        locationId
      )
    ) {
      return res.status(400).json({
        message: "Invalid locationId.",
      });
    }

    if (
      time &&
      endTime &&
      time === endTime
    ) {
      return res.status(400).json({
        message:
          "Start time and end time cannot be the same.",
      });
    }

    const attendanceRules = parseAttendanceRules(
      lateThresholdMinutes ?? event.lateThresholdMinutes,
      attendanceCloseAfterMinutes ??
        event.attendanceCloseAfterMinutes
    );

    if ("error" in attendanceRules) {
      return res.status(400).json({
        message: attendanceRules.error,
      });
    }

    if (req.file) {
      const uploadResult =
        await new Promise<any>(
          (resolve, reject) => {
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
          }
        );

      event.imageUrl =
        uploadResult.secure_url;
    }

    if (title) event.title = title;

    if (description)
      event.description = description;

    if (date) {
      const parsed = new Date(date);

      parsed.setHours(0, 0, 0, 0);

      event.date = parsed;
    }

    if (time) event.time = time;

    if (endTime)
      event.endTime = endTime;

    event.lateThresholdMinutes =
      attendanceRules.late;

    event.attendanceCloseAfterMinutes =
      attendanceRules.close;

    // Extending the window (or changing the start) can re-open attendance.
    event.isClosed = isPastCloseTime(event);

    if (locationId)
      event.locationId = locationId;

    /* NEW TARGETING */

    event.targetDepartments =
      parsedTargetDepartments;

    event.targetYearLevels =
      parsedTargetYearLevels;

    event.targetMajors =
      parsedTargetMajors;

    event.targetSections =
      parsedTargetSections;

    event.isForAllStudents =
      isForAllStudents === "true";

    const now = new Date(
      new Date().toLocaleString(
        "en-US",
        {
          timeZone: "Asia/Manila",
        }
      )
    );

    const safeParseTime = (t?: string) => {
      if (!t || !t.includes(":"))
        return [0, 0];

      return t.split(":").map(Number);
    };

    const [startH, startM] =
      safeParseTime(event.time);

    let [endH, endM] =
      safeParseTime(event.endTime);

    if (!event.endTime) {
      endH = startH + 1;
      endM = startM;
    }

    const baseDate = new Date(
      event.date
    );

    const eventStart = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      startH,
      startM
    );

    const eventEnd = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      endH,
      endM
    );

    if (eventEnd < eventStart) {
      eventEnd.setDate(
        eventEnd.getDate() + 1
      );
    }

    let newStatus =
      EventStatus.UPCOMING;

    if (
      event.status ===
      EventStatus.CANCELLED
    ) {
      newStatus =
        EventStatus.CANCELLED;
    } else if (now < eventStart) {
      newStatus =
        EventStatus.UPCOMING;
    } else if (now <= eventEnd) {
      newStatus =
        EventStatus.ONGOING;
    } else {
      newStatus =
        EventStatus.FINISHED;
    }

    event.status = newStatus;

    /* SAVE */
    const updatedEvent =
      await event.save();

    const populatedEvent =
      await updatedEvent.populate(
        "locationId"
      );

    return res.status(200).json({
      success: true,
      data: populatedEvent,
    });
  } catch (err) {
    console.error(
      "Error in updateEvent",
      err
    );

    return res.status(500).json({
      success: false,
      message:
        "Internal Server Error",
    });
  }
};

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

    // Soft delete: the event (and its image) is kept so it can be restored
    const event = await Event.findOneAndUpdate(
      { _id: eventId, ...NOT_DELETED },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (err) {
    console.error("Error in deleteEvent", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


export const restoreEvent = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findOneAndUpdate(
      { _id: eventId, isDeleted: true },
      { isDeleted: false, deletedAt: null },
      { new: true }
    ).populate("locationId");

    if (!event) {
      return res.status(404).json({ message: "Deleted event not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Event restored successfully",
      data: event,
    });
  } catch (err) {
    console.error("Error in restoreEvent", err);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


export const updateEventStatusToCanceled = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findOne({ _id: eventId, ...NOT_DELETED });

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
      ...NOT_DELETED,
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
      ...NOT_DELETED,
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
      ...NOT_DELETED,
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

export const getTotalOngoingEvents = async (req: Request, res: Response) => {
  try {
    const onGoingEvents = await Event.find({
      status: EventStatus.ONGOING,
      ...NOT_DELETED,
    }).populate("locationId");

    return res.status(200).json({
      success: true,
      data: onGoingEvents,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

export const getEventTrends = async (
  req: Request,
  res: Response,
) => {
  try {
    const { type = "weekly" } = req.query;

    if (type === "weekly") {
      const result = await Event.aggregate([
        { $match: NOT_DELETED },
        {
          $group: {
            _id: {
              $dayOfWeek: "$date",
            },
            events: {
              $sum: 1,
            },
          },
        },
      ]);

      const days = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
      ];

      const data = days.map((day, index) => {
        const found = result.find(
          (r) => r._id === index + 1
        );

        return {
          label: day,
          events: found?.events || 0,
        };
      });

      return res.json({
        success: true,
        data,
      });
    }

    if (type === "monthly") {
      const result = await Event.aggregate([
        { $match: NOT_DELETED },
        {
          $group: {
            _id: {
              $month: "$date",
            },
            events: {
              $sum: 1,
            },
          },
        },
      ]);

      const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      const data = months.map(
        (month, index) => {
          const found = result.find(
            (r) => r._id === index + 1
          );

          return {
            label: month,
            events: found?.events || 0,
          };
        }
      );

      return res.json({
        success: true,
        data,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trends",
    });
  }
};

export const getEventStatusAnalytics = async (
  req: Request,
  res: Response
) => {
  try {
    const completed = await Event.countDocuments({
      status: EventStatus.FINISHED,
      ...NOT_DELETED,
    });

    const ongoing = await Event.countDocuments({
      status: EventStatus.ONGOING,
      ...NOT_DELETED,
    });

    const upcoming = await Event.countDocuments({
      status: EventStatus.UPCOMING,
      ...NOT_DELETED,
    });

    const cancelled = await Event.countDocuments({
      status: EventStatus.CANCELLED,
      ...NOT_DELETED,
    });

    const total =
      completed +
      ongoing +
      upcoming +
      cancelled;

    const calculatePct = (value: number) =>
      total > 0
        ? `${Math.round((value / total) * 100)}%`
        : "0%";

    const data = [
      {
        name: "Completed",
        value: completed,
        color: "#0f766e",
        pct: calculatePct(completed),
      },
      {
        name: "Ongoing",
        value: ongoing,
        color: "#ec4899",
        pct: calculatePct(ongoing),
      },
      {
        name: "Upcoming",
        value: upcoming,
        color: "#8b5cf6",
        pct: calculatePct(upcoming),
      },
      {
        name: "Cancelled",
        value: cancelled,
        color: "#facc15",
        pct: calculatePct(cancelled),
      },
    ];

    return res.status(200).json({
      success: true,
      data,
      total,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch event analytics",
    });
  }
};

export const getFinishedEventTitles = async (
  req: Request,
  res: Response
) => {
  try {
    const events = await Event.find(
      { status: EventStatus.FINISHED, ...NOT_DELETED },
      { title: 1, _id: 1 } // only return id and title
    ).sort({ date: -1 });

    return res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch finished events",
    });
  }
};