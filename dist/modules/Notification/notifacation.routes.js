"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notification_controller_1 = require("./notification.controller");
const authmiddleware_1 = require("../../common/middleware/authmiddleware");
const AuthCookieMiddleware_1 = require("../../middleware/AuthCookieMiddleware");
const router = express_1.default.Router();
router.post("/createannouncements", authmiddleware_1.requireAuth, notification_controller_1.createAnnouncement);
router.get("/getannouncements", AuthCookieMiddleware_1.MobileAuth, notification_controller_1.getAnnouncements);
router.get("/getallnotifications", authmiddleware_1.requireAuth, notification_controller_1.getAllNotifications);
exports.default = router;
//# sourceMappingURL=notifacation.routes.js.map