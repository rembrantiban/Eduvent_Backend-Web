import { Request, Response } from "express";
import {
  Notification,
  NOTIFICATION_CATEGORIES,
} from "./notification.model";
import { User, NOT_DELETED } from "../User/user.Model";
import { Event } from "../Event/event.Model";
import { NotificationRead } from "./notification.read.model";

export const sendEventNotification = async (
  req: Request,
  res: Response
) => {

  try {

    const {
      title,
      message,
      eventId,
      category = "announcement",
    } = req.body;

    if (
      !title ||
      !message
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Title and message are required",
      });
    }

    if (
      !NOTIFICATION_CATEGORIES.includes(category)
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Invalid category",
      });
    }

    if (
      category === "event" &&
      !eventId
    ) {

      return res.status(400).json({

        success: false,

        message:
          "An event is required for the Events category",
      });
    }

    /* FIND EVENT (only for event announcements) */

    const event =
      category === "event"
        ? await Event.findOne({ _id: eventId, ...NOT_DELETED })
        : null;

    if (
      category === "event" &&
      !event
    ) {

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
      event &&
      !event.isForAllStudents
    ) {

      query.$and = [];

      if (
        event.targetDepartments?.length
      ) {

        query.$and.push({

          course: {
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
      await User.find({ ...query, ...NOT_DELETED });

    /* SAVE NOTIFICATION */

    const data =
      event
        ? {
            screen: "EventDetails",
            eventId: event._id.toString(),
          }
        : {
            screen: "Announcements",
          };

    const notification =
      await Notification.create({

        title,

        message,

        category,

        sender:
          req.user?._id,

        eventId:
          event?._id,

        data,
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

          ...data,

          notificationId:
            notification._id.toString(),

          category,

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

export const getAnnouncements = async (req: Request, res: Response) => {

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

        .populate({
          path: "eventId",
          select:
            "title description status imageUrl date time endTime locationId targetDepartments targetYearLevels targetMajors targetSections isForAllStudents",
          populate: {
            path: "locationId",
            select: "venue"
          },
        })

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

          /* General announcements / reminders go to everyone */
          if (!event) return true;

          if (
            event.isForAllStudents
          ) {
            return true;
          }

          const departmentMatch =
            !event.targetDepartments?.length ||
            event.targetDepartments.includes(
              req.user.course
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

    const reads = await NotificationRead.find({
      userId: req.user._id,
    });

    const readIds = new Set(
      reads.map((read) =>
        read.notificationId.toString()
      )
    );

    const notificationsWithReadStatus =
      filteredNotifications.map(
        (notification: any) => ({
          ...notification.toObject(),
          isRead: readIds.has(
            notification._id.toString()
          ),
        })
      );

    return res.status(200).json({
      success: true,
      notifications:
        notificationsWithReadStatus,
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

export const updateNotification = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const {
      title,
      message,
      eventId,
      category,
    } = req.body;

    const notification =
      await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (category) {
      if (!NOTIFICATION_CATEGORIES.includes(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category",
        });
      }

      if (
        category === "event" &&
        !eventId &&
        !notification.eventId
      ) {
        return res.status(400).json({
          success: false,
          message: "An event is required for the Events category",
        });
      }

      notification.category = category;

      // Only event announcements stay linked to an event
      if (category !== "event") {
        notification.eventId = undefined;
        notification.data = { screen: "Announcements" };
      }
    }

    // Validate event if changing event
    if (eventId && notification.category === "event") {
      const event = await Event.findOne({ _id: eventId, ...NOT_DELETED });

      if (!event) {
        return res.status(404).json({
          success: false,
          message: "Event not found",
        });
      }

      notification.eventId = event._id;
      notification.data = {
        screen: "EventDetails",
        eventId: event._id.toString(),
      };
    }

    if (title) notification.title = title;
    if (message) notification.message = message;

    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      notification,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notification",
    });
  }
};

export const deleteNotification = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;

    const notification =
      await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    // Delete notification
    await Notification.findByIdAndDelete(id);

    // Delete all read records related to this notification
    await NotificationRead.deleteMany({
      notificationId: id,
    });

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notification",
    });
  }
};

export const getAllNotifications = async (
  req: Request,
  res: Response
) => {
  try {
    const notifications = await Notification.find()
      .populate(
        "sender",
        "firstName lastName avatar"
      )
      .populate({
        path: "eventId",
        select: `
          title
          imageUrl
          date
          time
          endTime
          description
          status
          isForAllStudents
          targetDepartments
          targetYearLevels
          targetMajors
          targetSections
          locationId
        `,
        populate: {
          path: "locationId",
          select: "venue",
        },
      })
      .sort({
        createdAt: -1,
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

export const countUserUnreadNotification = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const notifications = await Notification.find()
      .populate("eventId");

    const filteredNotifications = notifications.filter(
      (notification: any) => {
        const event = notification.eventId;

        // General announcements / reminders go to everyone
        if (!event) return true;

        if (event.isForAllStudents) {
          return true;
        }

        const departmentMatch =
          !event.targetDepartments?.length ||
          event.targetDepartments.includes(
            req.user.course
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

    const reads = await NotificationRead.find({
      userId: req.user._id,
    });

    const readIds = new Set(
      reads.map((r) =>
        r.notificationId.toString()
      )
    );

    const unreadCount =
      filteredNotifications.filter(
        (notification: any) =>
          !readIds.has(notification._id.toString())
      ).length;

    return res.status(200).json({
      success: true,
      count: unreadCount,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to count unread notifications",
    });
  }
};

export const getNotificationById = async (
  req: Request,
  res: Response
) => {
  try {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const { id } = req.params;

    const notification = await Notification.findById(id)
      .populate(
        "sender",
        "firstName lastName avatar"
      )
      .populate({
        path: "eventId",
        select:
          "title description status imageUrl date time endTime locationId targetDepartments targetYearLevels targetMajors targetSections isForAllStudents",
        populate: {
          path: "locationId",
          select: "venue",
        },
      })

    console.log(
      JSON.stringify(notification?.eventId, null, 2)
    )
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const readRecord = await NotificationRead.findOne({
      userId: req.user._id,
      notificationId: notification._id,
    });

    return res.status(200).json({
      success: true,
      notification: {
        ...notification.toObject(),
        isRead: !!readRecord,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch notification",
    });
  }
};