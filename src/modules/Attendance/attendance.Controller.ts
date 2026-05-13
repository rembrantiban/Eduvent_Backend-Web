import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary";

import { Attendance } from "./attendance.Model";
import { Event } from "../Event/event.Model";
import { Location } from "../Location/location.Model";
import { calculateDistance } from "../../common/utils/distance";
import mongoose from "mongoose";
import { User } from "../../modules/User/user.Model"
import axios from "axios";
import FLASK_API from "../../config/flask";



export class AttendanceController {

  static async recordAttendance(
    req: Request,
    res: Response
  ) {

    try {

      const {
        eventId,
        attendanceType
      } = req.body;

      if (
        attendanceType !== "TIME_IN" &&
        attendanceType !== "TIME_OUT"
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Invalid attendance type"
        });

      }

      const lat =
        parseFloat(req.body.lat);

      const lng =
        parseFloat(req.body.lng);

      if (
        isNaN(lat) ||
        isNaN(lng)
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Invalid GPS coordinates"
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Image required"
        });
      }

      const file = req.file;

      const base64Image =
        file.buffer.toString(
          "base64"
        );

      const flaskResponse =
        await axios.post(
          `${FLASK_API}/recognize`,
          {
            image:
              `data:image/jpeg;base64,${base64Image}`
          }
        );

      const recognizeData =
        flaskResponse.data;

      console.log(
        "FLASK RESPONSE:",
        recognizeData
      );

      if (!recognizeData.success) {

        return res.status(401).json({
          success: false,
          message:
            recognizeData.message ||
            "Face not recognized"
        });

      }

      const recognizedStudentId =
        recognizeData.usn
          ?.trim()
          ?.toLowerCase();

      if (!recognizedStudentId) {
        return res.status(400).json({
          success: false,
          message: "Flask API returned invalid USN"
        });
      }

      console.log("RECOGNIZED STUDENT:", JSON.stringify(recognizedStudentId));

      const confidence = recognizeData.confidence;
      if (confidence > 70) {

        return res.status(401).json({
          success: false,
          message:
            "Face confidence too low"
        });

      }

      const allUsers = await User.find();
      console.log("[DEBUG] ALL USERS COUNT:", allUsers.length);
      console.log("[DEBUG] SEARCHING FOR:", recognizedStudentId);
      console.log("[DEBUG] ALL STUDENT IDS:",
        allUsers.map(u => ({
          studentId: u.studentId,
          matches: u.studentId?.toLowerCase() === recognizedStudentId
        }))
      );

      const user =
        await User.findOne({
          studentId: {
            $regex: new RegExp(
              `^${recognizedStudentId.trim()}$`,
              "i"
            )
          }
        });
      console.log("[DEBUG] FOUND USER:", user ? `${user.firstName} ${user.lastName}` : "NOT FOUND");

      if (!user) {

        return res.status(404).json({
          success: false,
          message:
            "Recognized student not found"
        });

      }

      if (String(user._id) !== String(req.user?._id)) {
        return res.status(403).json({
          success: false,
          message: "Face does not match logged in user"
        });

      }

      const userId = user._id;

      const existingAttendance =
        await Attendance.findOne({
          eventId,
          userId
        });

      const event =
        await Event.findById(
          eventId
        );

      if (!event) {

        return res.status(404).json({
          success: false,
          message:
            "Event not found"
        });

      }


      const eventLocation =
        await Location.findById(
          event.locationId
        );

      if (!eventLocation) {

        return res.status(404).json({
          success: false,
          message:
            "Event location not found"
        });

      }

      const distance =
        calculateDistance(
          Number(lat),
          Number(lng),
          eventLocation.latitude,
          eventLocation.longitude
        );

      const allowedRadius = 350;

      if (distance > allowedRadius) {

        return res.status(403).json({
          success: false,
          message:
            "You are not within the event location"
        });

      }

      console.log(
        "DISTANCE:",
        distance
      );

      const now = new Date();

      const eventStart =
        new Date(
          `${event.date
            .toISOString()
            .split("T")[0]}T${event.time}:00`
        );

      const status =
        now <= eventStart
          ? "Present"
          : "Late";

      // =========================
      // UPLOAD IMAGE
      // =========================

      const imageUrl =
        await new Promise<string>((
          resolve,
          reject
        ) => {

          const stream =
            cloudinary.uploader.upload_stream(
              {
                folder:
                  "attendance_faces"
              },
              (
                error,
                result
              ) => {

                if (error)
                  return reject(error);

                resolve(
                  result?.secure_url || ""
                );

              }
            );

          stream.end(file.buffer);

        });

      // =========================
      // TIME IN
      // =========================

      if (
        attendanceType ===
        "TIME_IN"
      ) {

        if (
          existingAttendance?.timeIn
        ) {

          return res.status(409).json({
            success: false,
            message:
              "Time in already recorded"
          });

        }

        const attendance =
          await Attendance.create({
            eventId,
            userId,
            faceToken: recognizedStudentId,
            confidence,
            status,
            timeIn: now,
            imageUrl

          });

        return res.status(201).json({

          success: true,
          type: "TIME_IN",
          message:
            "Time in recorded successfully",
          attendance

        });

      }

      if (!existingAttendance) {

        return res.status(404).json({
          success: false,
          message:
            "No existing time in record found"
        });

      }

      if (
        existingAttendance.timeOut
      ) {

        return res.status(409).json({
          success: false,
          message:
            "Time out already recorded"
        });

      }

      existingAttendance.faceToken = recognizedStudentId;

      existingAttendance.timeOut = now;

      existingAttendance.confidence = confidence;

      existingAttendance.imageUrl = imageUrl;

      await existingAttendance.save();

      return res.status(200).json({
        success: true,
        type: "TIME_OUT",
        message: "Time out recorded successfully",
        attendance:
          existingAttendance
      });

    } catch (error: any) {

      console.log("=========== ERROR START ===========");
      console.log(error);
      console.log("MESSAGE:");
      console.log(error?.message);
      console.log("RESPONSE:");
      console.log(error?.response?.data);
      console.log("STACK:");
      console.log(error?.stack);
      console.log("=========== ERROR END ===========");
      return res.status(500).json({
        success: false,
        message:
          error?.message ||
          "Attendance recording failed"
      });

    }

  }

  static async getEventAttendance(req: Request, res: Response) {
    try {

      const { eventId } = req.params;

      const eventObjectId = new mongoose.Types.ObjectId(eventId);

      const result = await Attendance.aggregate([

        {
          $match: { eventId: eventObjectId }
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
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            as: "event"
          }
        },

        {
          $unwind: "$user"
        },

        {
          $unwind: "$event"
        },

        {
          $facet: {

            attendance: [
              {
                $project: {
                  _id: 1,
                  status: 1,
                  confidence: 1,
                  timeIn: 1,
                  timeOut: 1,
                  imageUrl: 1,

                  user: {
                    firstName: "$user.firstName",
                    lastName: "$user.lastName",
                    email: "$user.email",
                    studentId: "$user.studentId",
                    department: "$user.department",
                    major: "$user.major",
                    section: "$user.section",
                    yearLevel: "$user.yearLevel"
                  },

                  event: {
                    title: "$event.title",
                    date: "$event.date",
                    time: "$event.time",
                    venue: "$event.venue"
                  }
                }
              }
            ],

            stats: [
              {
                $group: {
                  _id: null,
                  totalAttendees: { $sum: 1 },
                  presentCount: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "Present"] }, 1, 0]
                    }
                  },
                  lateCount: {
                    $sum: {
                      $cond: [{ $eq: ["$status", "Late"] }, 1, 0]
                    }
                  }
                }
              }
            ]
          }
        }
      ]);

      const attendance = result[0].attendance;
      const stats = result[0].stats[0] || {
        totalAttendees: 0,
        presentCount: 0,
        lateCount: 0
      };

      return res.status(200).json({
        ...stats,
        attendance
      });

    } catch (error) {

      return res.status(500).json({
        message: "Failed to fetch event attendance"
      });

    }
  }


  static async getEventsWithAttendance(req: Request, res: Response) {
    try {

      const events = await Attendance.aggregate([

        {
          $group: {
            _id: "$eventId",
            totalAttendees: { $sum: 1 }
          }
        },

        {
          $lookup: {
            from: "events",
            localField: "_id",
            foreignField: "_id",
            as: "event"
          }
        },

        {
          $unwind: "$event"
        },

        {
          $project: {
            id: "$event._id",
            title: "$event.title",
            date: "$event.date",
            time: "$event.time",
            venue: "$event.venue",
            department: "$event.department",
            totalAttendees: 1
          }
        },

        {
          $sort: { date: -1 }
        }

      ])

      return res.status(200).json(events)

    } catch (error) {

      return res.status(500).json({
        message: "Failed to fetch attendance events"
      })

    }
  }

  static async getAllAttendanceOngoing(req: Request, res: Response) {
    try {

      const result = await Attendance.aggregate([


        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            as: "event"
          }
        },

        {
          $unwind: "$event"
        },

        /* Filter Ongoing Events */

        {
          $match: {
            "event.status": "Ongoing"
          }
        },

        /* Join User */

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

        /* Project */

        {
          $project: {
            _id: 1,
            status: 1,
            confidence: 1,
            timeIn: 1,
            timeOut: 1,
            imageUrl: 1,

            user: {
              firstName: "$user.firstName",
              lastName: "$user.lastName",
              email: "$user.email",
              studentId: "$user.studentId",
              department: "$user.department",
              major: "$user.major",
              section: "$user.section",
              yearLevel: "$user.yearLevel"
            },

            event: {
              _id: "$event._id",
              title: "$event.title",
              date: "$event.date",
              time: "$event.time",
              venue: "$event.venue",
              status: "$event.status"
            }
          }
        },

        {
          $sort: {
            timeIn: -1
          }
        }

      ]);

      return res.status(200).json({
        success: true,
        total: result.length,
        attendance: result
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message: "Failed to fetch ongoing attendance"
      });

    }
  }

  static async getStudentDashboardStats(
    req: Request,
    res: Response
  ) {

    try {

      const userId = req.user?._id;

      if (!userId) {

        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });

      }

      const userObjectId =
        new mongoose.Types.ObjectId(userId);

      /* TOTAL ATTENDANCE */

      const totalAttendance =
        await Attendance.countDocuments({
          userId: userObjectId
        });

      /* EVENTS JOINED */

      const eventsJoined =
        await Attendance.distinct(
          "eventId",
          {
            userId: userObjectId
          }
        );

      /* MISSED EVENTS */

      const missedEvents =
        await Event.countDocuments({

          status: "Completed",

          _id: {
            $nin: eventsJoined
          }

        });

      /* UPCOMING EVENTS */

      const upcomingEventsCount =
        await Event.countDocuments({
          status: "Upcoming"
        });

      return res.status(200).json({

        success: true,

        stats: {

          attendanceCount:
            totalAttendance,

          eventsJoinedCount:
            eventsJoined.length,

          missedEventsCount:
            missedEvents,

          upcomingEventsCount:
            upcomingEventsCount
        }

      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch dashboard stats"
      });

    }
  }

  static async getMyAttendanceHistory(
    req: Request,
    res: Response
  ) {

    try {

      const userId = req.user?._id;

      if (!userId) {

        return res.status(401).json({
          success: false,
          message: "Unauthorized"
        });

      }

      const userObjectId =
        new mongoose.Types.ObjectId(userId);

      const attendance =
        await Attendance.aggregate([

          {
            $match: {
              userId: userObjectId
            }
          },

          {
            $lookup: {
              from: "events",
              localField: "eventId",
              foreignField: "_id",
              as: "event"
            }
          },

          {
            $unwind: "$event"
          },

          {
            $project: {

              _id: 1,

              status: 1,

              timeIn: 1,

              timeOut: 1,

              imageUrl: 1,

              confidence: 1,

              createdAt: 1,

              event: {
                _id: "$event._id",
                title: "$event.title",
                description:
                  "$event.description",
                venue: "$event.venue",
                date: "$event.date",
                time: "$event.time",
                status: "$event.status",
                department:
                  "$event.department"
              }

            }
          },

          {
            $sort: {
              createdAt: -1
            }
          }

        ]);

      return res.status(200).json({

        success: true,

        total: attendance.length,

        attendance

      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch attendance history"
      });

    }
  }
}