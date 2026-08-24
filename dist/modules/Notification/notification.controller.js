"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNotificationById = exports.countUserUnreadNotification = exports.getAllNotifications = exports.deleteNotification = exports.updateNotification = exports.getAnnouncements = exports.sendEventNotification = void 0;
const notification_model_1 = require("./notification.model");
const user_Model_1 = require("../User/user.Model");
const event_Model_1 = require("../Event/event.Model");
const notification_read_model_1 = require("./notification.read.model");
const sendEventNotification = async (req, res) => {
    try {
        const { title, message, eventId, } = req.body;
        if (!title ||
            !message ||
            !eventId) {
            return res.status(400).json({
                success: false,
                message: "Title, message, and eventId are required",
            });
        }
        /* FIND EVENT */
        const event = await event_Model_1.Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }
        /* BUILD STUDENT QUERY */
        let query = {
            role: "student",
            pushToken: {
                $ne: null,
            },
        };
        /* TARGET FILTERS */
        if (!event.isForAllStudents) {
            query.$and = [];
            if (event.targetDepartments?.length) {
                query.$and.push({
                    course: {
                        $in: event.targetDepartments,
                    },
                });
            }
            if (event.targetYearLevels?.length) {
                query.$and.push({
                    yearLevel: {
                        $in: event.targetYearLevels,
                    },
                });
            }
            if (event.targetMajors?.length) {
                query.$and.push({
                    major: {
                        $in: event.targetMajors,
                    },
                });
            }
            if (event.targetSections?.length) {
                query.$and.push({
                    section: {
                        $in: event.targetSections,
                    },
                });
            }
        }
        /* FIND MATCHING STUDENTS */
        const students = await user_Model_1.User.find(query);
        /* SAVE NOTIFICATION */
        const notification = await notification_model_1.Notification.create({
            title,
            message,
            sender: req.user?._id,
            eventId: event._id,
            data: {
                screen: "EventDetails",
                eventId: event._id.toString(),
            },
        });
        /* BUILD PUSH PAYLOAD */
        const messages = students.map((user) => ({
            to: user.pushToken,
            sound: "default",
            title,
            body: message,
            data: {
                screen: "EventDetails",
                eventId: event._id.toString(),
                senderName: `${req.user?.firstName} ${req.user?.lastName}`,
            },
        }));
        /* SEND IN CHUNKS */
        for (let i = 0; i < messages.length; i += 100) {
            const chunk = messages.slice(i, i + 100);
            await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(chunk),
            });
        }
        return res.status(200).json({
            success: true,
            totalRecipients: students.length,
            message: "Event notification sent successfully",
            notification,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to send event notification",
        });
    }
};
exports.sendEventNotification = sendEventNotification;
const getAnnouncements = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        const notifications = await notification_model_1.Notification.find()
            .populate("sender", "firstName lastName avatar")
            .populate({
            path: "eventId",
            select: "title description status imageUrl date time endTime locationId targetDepartments targetYearLevels targetMajors targetSections isForAllStudents",
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
        const filteredNotifications = notifications.filter((notification) => {
            const event = notification.eventId;
            if (!event)
                return false;
            if (event.isForAllStudents) {
                return true;
            }
            const departmentMatch = !event.targetDepartments?.length ||
                event.targetDepartments.includes(req.user.course);
            const yearMatch = !event.targetYearLevels?.length ||
                event.targetYearLevels.includes(req.user.yearLevel);
            const majorMatch = !event.targetMajors?.length ||
                event.targetMajors.includes(req.user.major);
            const sectionMatch = !event.targetSections?.length ||
                event.targetSections.includes(req.user.section);
            return (departmentMatch &&
                yearMatch &&
                majorMatch &&
                sectionMatch);
        });
        const reads = await notification_read_model_1.NotificationRead.find({
            userId: req.user._id,
        });
        const readIds = new Set(reads.map((read) => read.notificationId.toString()));
        const notificationsWithReadStatus = filteredNotifications.map((notification) => ({
            ...notification.toObject(),
            isRead: readIds.has(notification._id.toString()),
        }));
        return res.status(200).json({
            success: true,
            notifications: notificationsWithReadStatus,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch announcements",
        });
    }
};
exports.getAnnouncements = getAnnouncements;
const updateNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, message, eventId, } = req.body;
        const notification = await notification_model_1.Notification.findById(id);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }
        // Validate event if changing event
        if (eventId) {
            const event = await event_Model_1.Event.findById(eventId);
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
        if (title)
            notification.title = title;
        if (message)
            notification.message = message;
        await notification.save();
        return res.status(200).json({
            success: true,
            message: "Notification updated successfully",
            notification,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to update notification",
        });
    }
};
exports.updateNotification = updateNotification;
const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await notification_model_1.Notification.findById(id);
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }
        // Delete notification
        await notification_model_1.Notification.findByIdAndDelete(id);
        // Delete all read records related to this notification
        await notification_read_model_1.NotificationRead.deleteMany({
            notificationId: id,
        });
        return res.status(200).json({
            success: true,
            message: "Notification deleted successfully",
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete notification",
        });
    }
};
exports.deleteNotification = deleteNotification;
const getAllNotifications = async (req, res) => {
    try {
        const notifications = await notification_model_1.Notification.find()
            .populate("sender", "firstName lastName avatar")
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
        `,
        })
            .sort({
            createdAt: -1,
        });
        return res.status(200).json({
            success: true,
            notifications,
        });
    }
    catch (error) {
        console.error("Error fetching notifications:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch notifications",
        });
    }
};
exports.getAllNotifications = getAllNotifications;
const countUserUnreadNotification = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const notifications = await notification_model_1.Notification.find()
            .populate("eventId");
        const filteredNotifications = notifications.filter((notification) => {
            const event = notification.eventId;
            if (!event)
                return false;
            if (event.isForAllStudents) {
                return true;
            }
            const departmentMatch = !event.targetDepartments?.length ||
                event.targetDepartments.includes(req.user.course);
            const yearMatch = !event.targetYearLevels?.length ||
                event.targetYearLevels.includes(req.user.yearLevel);
            const majorMatch = !event.targetMajors?.length ||
                event.targetMajors.includes(req.user.major);
            const sectionMatch = !event.targetSections?.length ||
                event.targetSections.includes(req.user.section);
            return (departmentMatch &&
                yearMatch &&
                majorMatch &&
                sectionMatch);
        });
        const reads = await notification_read_model_1.NotificationRead.find({
            userId: req.user._id,
        });
        const readIds = new Set(reads.map((r) => r.notificationId.toString()));
        const unreadCount = filteredNotifications.filter((notification) => !readIds.has(notification._id.toString())).length;
        return res.status(200).json({
            success: true,
            count: unreadCount,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to count unread notifications",
        });
    }
};
exports.countUserUnreadNotification = countUserUnreadNotification;
const getNotificationById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const { id } = req.params;
        const notification = await notification_model_1.Notification.findById(id)
            .populate("sender", "firstName lastName avatar")
            .populate({
            path: "eventId",
            select: "title description status imageUrl date time endTime locationId targetDepartments targetYearLevels targetMajors targetSections isForAllStudents",
            populate: {
                path: "locationId",
                select: "venue",
            },
        });
        console.log(JSON.stringify(notification?.eventId, null, 2));
        if (!notification) {
            return res.status(404).json({
                success: false,
                message: "Notification not found",
            });
        }
        const readRecord = await notification_read_model_1.NotificationRead.findOne({
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
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch notification",
        });
    }
};
exports.getNotificationById = getNotificationById;
//# sourceMappingURL=notification.controller.js.map