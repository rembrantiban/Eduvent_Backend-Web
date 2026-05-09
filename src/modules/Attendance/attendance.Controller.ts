import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary";
import { FaceService } from "../Face/face.service";
import { FaceUser } from "../Face/face.model";
import { Attendance } from "./attendance.Model";
import { Event } from "../Event/event.Model";
import { Location } from "../Location/location.Model";
import { calculateDistance } from "../../common/utils/distance";
import mongoose from "mongoose";

export class AttendanceController {

  static async recordAttendance(req: Request, res: Response) {
    try {

      const { eventId } = req.body;

      const lat = parseFloat(req.body.lat);
      const lng = parseFloat(req.body.lng);

      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({
          message: "Invalid GPS coordinates"
        });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Image required" });
      }

      const file = req.file;

      if (!eventId) {
        return res.status(400).json({ message: "Event ID required" });
      }

      if (!lat || !lng) {
        return res.status(400).json({
          message: "User GPS location required"
        });
      }

      /* 1 Detect face */

      const detect = await FaceService.detectFace(file.buffer);

      if (!detect.faces || detect.faces.length === 0) {
        return res.status(400).json({
          message: "No face detected"
        });
      }

      const faceToken = detect.faces[0].face_token;

      /* 2 Identify face */

      const search = await FaceService.searchFace(faceToken);

      if (!search.results || search.results.length === 0) {
        return res.status(404).json({
          message: "Face not recognized"
        });
      }

      const best = search.results[0];

      if (best.confidence < 90) {
        return res.status(401).json({
          message: "Face does not match registered users"
        });
      }

      /* 3 Find registered user */

      const faceUser = await FaceUser.findOne({
        faceToken: best.face_token
      });

      if (!faceUser) {
        return res.status(404).json({
          message: "User not found for this face"
        });
      }

      const userId = faceUser.userId;

      /* 4 Prevent duplicate attendance */

      const existingAttendance = await Attendance.findOne({
        eventId,
        userId
      });



      /* 5 Find event */

      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({
          message: "Event not found"
        });
      }

      /* 6 Validate user location */

      const eventLocation = await Location.findById(event.locationId);

      if (!eventLocation) {
        return res.status(404).json({
          message: "Event location not found"
        });
      }

      const distance = calculateDistance(
        Number(lat),
        Number(lng),
        eventLocation.latitude,
        eventLocation.longitude
      );

      const allowedRadius = 350;

      if (distance > allowedRadius) {
        return res.status(403).json({
          message: "You are not within the event location"
        });
      }

      console.log("User GPS:", lat, lng);
      console.log("Event GPS:", eventLocation.latitude, eventLocation.longitude);
      console.log("Distance (meters):", distance);
      console.log("Allowed Radius:", allowedRadius);

      /* 7 Determine Present or Late */

      const now = new Date();

      const eventStart = new Date(
        `${event.date.toISOString().split("T")[0]}T${event.time}:00`
      );

      const status = now <= eventStart ? "Present" : "Late";

      /* 8 Upload image to Cloudinary */

      const imageUrl = await new Promise<string>((resolve, reject) => {

        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "attendance_faces"
          },
          (error, result) => {

            if (error) return reject(error);

            resolve(result?.secure_url || "");
          }
        );

        stream.end(file.buffer);

      });

      /* 9 Save attendance */
      /* 9 Attendance Logic */

      if (!existingAttendance) {

        /* FIRST SCAN = TIME IN */

        const attendance =
          await Attendance.create({
            eventId,
            userId,
            faceToken: best.face_token,
            confidence: best.confidence,
            status,
            timeIn: now,
            imageUrl
          });

        return res.status(201).json({
          success: true,
          type: "TIME_IN",
          message: "Time in recorded successfully",
          attendance
        });

      }

      /* SECOND SCAN = TIME OUT */

      if (
        existingAttendance.timeOut
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Time out already recorded"
        });
      }

      /* UPDATE TIME OUT */

      existingAttendance.timeOut =
        now;

      existingAttendance.confidence =
        best.confidence;

      existingAttendance.imageUrl =
        imageUrl;

      await existingAttendance.save();

      return res.status(200).json({
        success: true,
        type: "TIME_OUT",
        message:
          "Time out recorded successfully",
        attendance:
          existingAttendance
      });

    } catch (error: any) {

      console.error(error?.response?.data || error.message);

      return res.status(500).json({
        message: "Attendance recording failed"
      });

    }
  };

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
}