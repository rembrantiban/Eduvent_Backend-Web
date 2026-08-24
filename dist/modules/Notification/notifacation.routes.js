"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notification_controller_1 = require("./notification.controller");
const authmiddleware_1 = require("../../common/middleware/authmiddleware");
const AuthCookieMiddleware_1 = require("../../middleware/AuthCookieMiddleware");
const notification_read_controller_1 = require("./notification.read.controller");
const router = express_1.default.Router();
router.post("/sendeventnotification", authmiddleware_1.requireAuth, notification_controller_1.sendEventNotification);
router.get("/getannouncements", AuthCookieMiddleware_1.MobileAuth, notification_controller_1.getAnnouncements);
router.get("/getallnotifications", authmiddleware_1.requireAuth, notification_controller_1.getAllNotifications);
router.patch("/markasread/:notificationId", AuthCookieMiddleware_1.MobileAuth, notification_read_controller_1.markNotificationAsRead);
router.get("/countunread", AuthCookieMiddleware_1.MobileAuth, notification_controller_1.countUserUnreadNotification);
router.put("/:id", authmiddleware_1.requireAuth, notification_controller_1.updateNotification);
router.delete("/:id", authmiddleware_1.requireAuth, notification_controller_1.deleteNotification);
router.get("/get-notification/:id", authmiddleware_1.requireAuth, notification_controller_1.getNotificationById);
exports.default = router;
//# sourceMappingURL=notifacation.routes.js.map