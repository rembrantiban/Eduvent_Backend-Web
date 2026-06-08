import { Request, Response } from "express";
import { Notification } from "./notification.model";
import { User } from "../User/user.Model";
import { Event } from "../Event/event.Model";

export const sendEventNotification =
  async (
    req: Request,
    res: Response
  ) => {

    try {

      const {
        title,
        message,
        eventId,
      } = req.body;

      if (
        !title ||
        !message ||
        !eventId
      ) {

        return res.status(400).json({

          success: false,

          message:
            "Title, message, and eventId are required",
        });
      }

      /* FIND EVENT */

      const event =
        await Event.findById(eventId);

      if (!event) {

        return res.status(404).json({

          success: false,

          message:
            "Event not found",
        });
      }

      /* BUILD STUDENT QUERY */

      let query: any = {

        role: "student",

        pushToken: {
          $ne: null,
        },
      };

      /* TARGET FILTERS */

      if (
        !event.isForAllStudents
      ) {

        query.$and = [];

        if (
          event.targetDepartments?.length
        ) {

          query.$and.push({

            department: {
              $in:
                event.targetDepartments,
            },
          });
        }

        if (
          event.targetYearLevels?.length
        ) {

          query.$and.push({

            yearLevel: {
              $in:
                event.targetYearLevels,
            },
          });
        }

        if (
          event.targetMajors?.length
        ) {

          query.$and.push({

            major: {
              $in:
                event.targetMajors,
            },
          });
        }

        if (
          event.targetSections?.length
        ) {

          query.$and.push({

            section: {
              $in:
                event.targetSections,
            },
          });
        }
      }

      /* FIND MATCHING STUDENTS */

      const students =
        await User.find(query);

      /* SAVE NOTIFICATION */

      const notification =
        await Notification.create({

          title,

          message,

          sender:
            req.user?._id,

          eventId:
            event._id,

          data: {

            screen:
              "EventDetails",

            eventId:
              event._id.toString(),
          },
        });

      /* BUILD PUSH PAYLOAD */

      const messages =
        students.map((user) => ({

          to:
            user.pushToken as string,

          sound: "default",

          title,

          body: message,

          data: {

            screen:
              "EventDetails",

            eventId:
              event._id.toString(),

            senderName:
              `${req.user?.firstName} ${req.user?.lastName}`,
          },
        }));

      /* SEND IN CHUNKS */

      for (
        let i = 0;
        i < messages.length;
        i += 100
      ) {

        const chunk =
          messages.slice(
            i,
            i + 100
          );

        await fetch(
          "https://exp.host/--/api/v2/push/send",
          {

            method: "POST",

            headers: {

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(chunk),
          }
        );
      }

      return res.status(200).json({

        success: true,

        totalRecipients:
          students.length,

        message:
          "Event notification sent successfully",

        notification,
      });

    } catch (error) {

      console.error(error);

      return res.status(500).json({

        success: false,

        message:
          "Failed to send event notification",
      });
    }
  };

export const getAnnouncements = async ( req: Request,  res: Response ) => {

  try {

    if (!req.user) {

      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const notifications =
      await Notification.find()

        .populate(
          "sender",
          "firstName lastName avatar"
        )

        .populate(
          "eventId",
          "title description status imageUrl date time endTime locationId targetDepartments targetYearLevels targetMajors targetSections isForAllStudents"
        )

        .sort({
          createdAt: -1,
        });

    /* FILTER ONLY NOTIFICATIONS
       THAT MATCH CURRENT USER */

    const filteredNotifications =
      notifications.filter(
        (notification: any) => {

          const event =
            notification.eventId;

          if (!event) return false;

          if (
            event.isForAllStudents
          ) {
            return true;
          }

          const departmentMatch =
            !event.targetDepartments?.length ||
            event.targetDepartments.includes(
              req.user.department
            );

          const yearMatch =
            !event.targetYearLevels?.length ||
            event.targetYearLevels.includes(
              req.user.yearLevel
            );

          const majorMatch =
            !event.targetMajors?.length ||
            event.targetMajors.includes(
              req.user.major
            );

          const sectionMatch =
            !event.targetSections?.length ||
            event.targetSections.includes(
              req.user.section
            );

          return (
            departmentMatch &&
            yearMatch &&
            majorMatch &&
            sectionMatch
          );
        }
      );

    return res.status(200).json({

      success: true,

      notifications:
        filteredNotifications,
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({

      success: false,

      message:
        "Failed to fetch announcements",
    });
  }
};
export const getAllNotifications = async ( req: Request, res: Response) => {

    try {
      const notifications = await Notification.find()

          .populate(
            "sender",
            "firstName lastName avatar"
          )

          .populate(
            "eventId",
            "title imageUrl"
          )

          .sort({
            createdAt: -1
          });

      return res.status(200).json({
        success: true,
        notifications,
      });

    } catch (error) {
      console.error(
        "Error fetching notifications:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch notifications",
      });
    }
  };