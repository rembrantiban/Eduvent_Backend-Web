import { Request, Response } from "express";
import mongoose from "mongoose";

import { Attendance } from "./attendance.Model";
import { Event } from "../Event/event.Model";
import { User } from "../User/user.Model";

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

    /*
      STEP 1:
      Get all students eligible for this event
    */

    let eligibleUsers = [];

    if (event.isForAllStudents) {
      eligibleUsers = await User.find({
        user_type: "student",
      });
    } else {
      eligibleUsers = await User.find({
        user_type: "student",

        ...(event.targetDepartments?.length && {
          department: {
            $in: event.targetDepartments,
          },
        }),

        ...(event.targetMajors?.length && {
          major: {
            $in: event.targetMajors,
          },
        }),

        ...(event.targetYearLevels?.length && {
          yearLevel: {
            $in: event.targetYearLevels,
          },
        }),

        ...(event.targetSections?.length && {
          section: {
            $in: event.targetSections,
          },
        }),
      });
    }

    /*
      STEP 2:
      Get attendance records
    */

    const attendanceRecords =
      await Attendance.find({
        eventId,
      });

    /*
      STEP 3:
      Count statuses
    */

    const present = attendanceRecords.filter(
      (a) => a.status === "Present"
    ).length;

    const late = attendanceRecords.filter(
      (a) => a.status === "Late"
    ).length;

    /*
      STEP 4:
      Absent = eligible users NOT in attendance
    */

    const attendedUserIds = attendanceRecords.map(
      (a) => a.userId.toString()
    );

    const absentUsers = eligibleUsers.filter(
      (user) =>
        !attendedUserIds.includes(
          user._id.toString()
        )
    );

    const absent = absentUsers.length;

    const total = eligibleUsers.length;

    const attendanceRate =
      total > 0
        ? Math.round(
            ((present + late) / total) * 100
          )
        : 0;

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
        attendanceRate,
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

      absentUsers,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};