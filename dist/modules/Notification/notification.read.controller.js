"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationAsRead = void 0;
const notification_read_model_1 = require("./notification.read.model");
const markNotificationAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params;
        await notification_read_model_1.NotificationRead.findOneAndUpdate({
            notificationId,
            userId: req.user._id,
        }, {
            readAt: new Date(),
        }, {
            upsert: true,
            new: true,
        });
        res.status(200).json({
            success: true,
            message: "Notification marked as read",
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to mark notification as read",
        });
    }
};
exports.markNotificationAsRead = markNotificationAsRead;
//# sourceMappingURL=notification.read.controller.js.map