import { Request, Response } from "express";
import mongoose from "mongoose";

import { Attendance } from "./attendance.Model";
import { Event, EventStatus } from "../Event/event.Model";
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
                role: "student",
            });
        } else {
            eligibleUsers = await User.find({
                role: "student",

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

        const total = Math.max(
            eligibleUsers.length,
            attendanceRecords.length
        );

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

export const getAttendancePerEvent = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await Attendance.aggregate([
      {
        $group: {
          _id: "$eventId",
          attendees: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "events",
          localField: "_id",
          foreignField: "_id",
          as: "event",
        },
      },
      {
        $unwind: "$event",
      },
      {
        $project: {
          _id: 0,
          event: "$event.title",
          attendees: 1,
        },
      },
      {
        $sort: {
          attendees: -1,
        },
      },
    ]);

    const total = result.reduce(
      (sum, item) => sum + item.attendees,
      0
    );

    const max =
      result.length > 0
        ? Math.max(
            ...result.map(
              (item) => item.attendees
            )
          )
        : 0;

    return res.status(200).json({
      success: true,
      data: result,
      total,
      max,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch attendance analytics",
    });
  }
};

export const getAttendanceByDepartment = async (
  req: Request,
  res: Response
) => {
  try {
    const departmentStats = await Attendance.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "student",
        },
      },

      {
        $unwind: "$student",
      },

      {
        $group: {
          _id: "$student.department",

          total: { $sum: 1 },

          attended: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    ["Present", "Late"],
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },

      {
        $project: {
          _id: 0,

          department: "$_id",

          attendanceRate: {
            $round: [
              {
                $multiply: [
                  {
                    $divide: [
                      "$attended",
                      "$total",
                    ],
                  },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },

      {
        $sort: {
          attendanceRate: -1,
        },
      },
    ]);

    const average =
      departmentStats.length > 0
        ? (
            departmentStats.reduce(
              (sum, dept) =>
                sum +
                dept.attendanceRate,
              0
            ) /
            departmentStats.length
          ).toFixed(1)
        : 0;

    const topDepartment =
      departmentStats[0] || null;

    return res.status(200).json({
      success: true,

      data: departmentStats,

      average,

      topDepartment,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch department analytics",
    });
  }
};


export const getOngoingEventAttendanceAnalytics = async (
  req: Request,
  res: Response
) => {
  try {
    const ongoingEvents = await Event.find({
      status: EventStatus.ONGOING,
    }).select("_id title");

    const eventIds = ongoingEvents.map(
      (event) => event._id
    );

    const attendance = await Attendance.aggregate([
      {
        $match: {
          eventId: { $in: eventIds },
        },
      },

      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },

      {
        $unwind: "$user",
      },

      {
        $group: {
          _id: {
            department: "$user.department",
            major: "$user.major",
            section: "$user.section",
          },
          value: { $sum: 1 }, // attendees
        },
      },
    ]);

    const analytics = await Promise.all(
      attendance.map(async (item) => {
        const totalStudents =
          await User.countDocuments({
            department: item._id.department,
            major: item._id.major,
            section: item._id.section,
            role: "student",
          });

        const attendanceRate =
          totalStudents > 0
            ? Number(
                (
                  (item.value / totalStudents) *
                  100
                ).toFixed(1)
              )
            : 0;

        return {
          department: item._id.department,
          major: item._id.major,
          section: item._id.section,

          value: item.value,
          totalStudents,
          attendanceRate,
        };
      })
    );

    analytics.sort(
      (a, b) => b.attendanceRate - a.attendanceRate
    );

    return res.status(200).json({
      success: true,
      events: ongoingEvents,
      data: analytics,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
    });
  }
};


 export const getAllAttendanceReports = async (
    req: Request,
    res: Response
  ) => {
    try {

      const events = await Event.find()
        .populate(
          "locationId",
          "venue"
        );

      const reports = await Promise.all(
        events.map(async (event) => {

          const attendance =
            await Attendance.aggregate([
              {
                $match: {
                  eventId: event._id
                }
              },
              {
                $lookup: {
                  from: "users",
                  localField: "userId",
                  foreignField: "_id",
                  as: "user"
                }
              },
              {
                $unwind: "$user"
              },
              {
                $project: {
                  status: 1,
                  timeIn: 1,
                  timeOut: 1,

                  student: {
                    $concat: [
                      "$user.firstName",
                      " ",
                      "$user.lastName"
                    ]
                  },

                  studentId:
                    "$user.studentId",

                  department:
                    "$user.department",

                  major:
                    "$user.major",

                  yearLevel:
                    "$user.yearLevel",

                  section:
                    "$user.section"
                }
              }
            ]);

          return {
            title: event.title,
            date: event.date,
            time: event.time,
            venue:
              (event.locationId as any)?.venue ||
              "No Venue",
            attendees: attendance
          };
        })
      );

      return res.status(200).json({
        success: true,
        reports
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch attendance reports"
      });

    }
  }