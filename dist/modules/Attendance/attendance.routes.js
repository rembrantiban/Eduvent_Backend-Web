"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const attendance_Controller_1 = require("./attendance.Controller");
const AuthCookieMiddleware_1 = __importDefault(require("../../middleware/AuthCookieMiddleware"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
});
router.post("/record", upload.single("image"), AuthCookieMiddleware_1.default, attendance_Controller_1.AttendanceController.recordAttendance);
router.get("/get-event-attendance/:eventId", attendance_Controller_1.AttendanceController.getEventAttendance);
router.get("/get-events-with-attendance", attendance_Controller_1.AttendanceController.getEventsWithAttendance);
router.get("/get-all-attendance-ongoing", AuthCookieMiddleware_1.default, attendance_Controller_1.AttendanceController.getAllAttendanceOngoing);
router.get("/my-attendance-history", AuthCookieMiddleware_1.default, attendance_Controller_1.AttendanceController.getMyAttendanceHistory);
router.get("/dashboard-stats", AuthCookieMiddleware_1.default, attendance_Controller_1.AttendanceController.getStudentDashboardStats);
exports.default = router;
//# sourceMappingURL=attendance.routes.js.map