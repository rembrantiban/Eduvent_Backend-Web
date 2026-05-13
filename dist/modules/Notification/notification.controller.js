"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllNotifications = exports.getAnnouncements = exports.createAnnouncement = void 0;
const notification_model_1 = require("./notification.model");
const user_Model_1 = require("../User/user.Model");
const createAnnouncement = async (req, res) => {
    try {
        const { title, message, targetDepartment } = req.body;
        // 1. Save notification
        const notification = await notification_model_1.Notification.create({
            title,
            message,
            sender: req.user._id,
            targetDepartment: targetDepartment || "All Department",
            data: {
                screen: "Announcements",
            },
        });
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        let query = {
            role: "student",
            pushToken: { $ne: null },
        };
        if (targetDepartment && targetDepartment !== "All Department") {
            query.department = targetDepartment;
        }
        const students = await user_Model_1.User.find(query);
        console.log("Sending to users:", students.length);
        const messages = students.map((user) => ({
            to: user.pushToken,
            sound: "default",
            title,
            body: message,
            data: {
                screen: "Announcements",
                senderName: `${req.user.firstName} ${req.user.lastName}`,
            },
        }));
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
        res.status(200).json({
            success: true,
            message: "Notification sent successfully",
            notification,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to send notification",
        });
    }
};
exports.createAnnouncement = createAnnouncement;
const getAnnouncements = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const userDepartment = req.user.department;
        const notifications = await notification_model_1.Notification.find({
            $or: [
                { targetDepartment: "All Department" },
                { targetDepartment: userDepartment },
            ],
        })
            .sort({ createdAt: -1 })
            .populate("sender", "firstName lastName");
        return res.status(200).json({
            success: true,
            notifications,
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
const getAllNotifications = async (req, res) => {
    try {
        const notifications = await notification_model_1.Notification.find()
            .populate("sender", "firstName lastName avatar")
            .sort({ createdAt: -1 });
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
//# sourceMappingURL=notification.controller.js.map