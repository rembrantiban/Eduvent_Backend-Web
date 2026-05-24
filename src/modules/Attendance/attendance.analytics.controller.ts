import { Request, Response } from "express";
import mongoose from "mongoose";

import { Attendance } from "./attendance.Model"
import { Event } from "../Event/event.Model";

export const getAttendanceAnalytics = async (
  req: Request,
  res: Response
) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event id",
      });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    const attendance = await Attendance.find({
      eventId,
    });

    const present = attendance.filter(
      (a) => a.status === "Present"
    ).length;

    const late = attendance.filter(
      (a) => a.status === "Late"
    ).length;

    const absent = attendance.filter(
      (a) => a.status === "Absent"
    ).length;

    const total = present + late + absent;

    res.status(200).json({
      success: true,

      event: {
        _id: event._id,
        title: event.title,
        description: event.description,
        date: event.date,
      },

      analytics: {
        total,
        present,
        late,
        absent,

        attendanceRate:
          total > 0
            ? Math.round(
                ((present + late) / total) * 100
              )
            : 0,
      },

      chartData: [
        {
          name: "Present",
          value: present,
        },
        {
          name: "Late",
          value: late,
        },
        {
          name: "Absent",
          value: absent,
        },
      ],
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};