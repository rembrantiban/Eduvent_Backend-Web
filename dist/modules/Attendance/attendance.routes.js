"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const attendance_Controller_1 = require("./attendance.Controller");
const attendance_analytics_controller_1 = require("./attendance.analytics.controller");
const AuthCookieMiddleware_1 = __importDefault(require("../../middleware/AuthCookieMiddleware"));
const authmiddleware_1 = require("../../common/middleware/authmiddleware");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
});
router.post("/record", AuthCookieMiddleware_1.default, upload.single("image"), (req, res, next) => {
    console.log("ROUTE HIT");
    next();
}, attendance_Controller_1.AttendanceController.recordAttendance);
router.get("/get-event-attendance/:eventId", attendance_Controller_1.AttendanceController.getEventAttendance);
router.get("/get-events-with-attendance", attendance_Controller_1.AttendanceController.getEventsWithAttendance);
router.get("/get-all-attendance-ongoing", AuthCookieMiddleware_1.default, attendance_Controller_1.AttendanceController.getAllAttendanceOngoing);
router.get("/my-attendance-history", AuthCookieMiddleware_1.default, attendance_Controller_1.AttendanceController.getMyAttendanceHistory);
router.get("/dashboard-stats", AuthCookieMiddleware_1.default, attendance_Controller_1.AttendanceController.getStudentDashboardStats);
router.get("/analytics/:eventId", authmiddleware_1.requireAuth, attendance_analytics_controller_1.getAttendanceAnalytics);
// Student Attendance Analytics
router.get("/student-analytics", AuthCookieMiddleware_1.default, attendance_Controller_1.AttendanceController.getStudentAttendanceAnalytics);
// Student Recent Activity 
router.get("/recent-activity", AuthCookieMiddleware_1.default, attendance_Controller_1.AttendanceController.getRecentActivity);
// Attendance Per Event
router.get("/attendance-per-event", attendance_analytics_controller_1.getAttendancePerEvent);
//Attendance Per Department 
router.get("/attendance-by-department", attendance_analytics_controller_1.getAttendanceByDepartment);
//Attendance Analytics 
router.get("/attendance-analytics", attendance_analytics_controller_1.getOngoingEventAttendanceAnalytics);
// All Attendance Reports
router.get("/get-reports", attendance_analytics_controller_1.getAllAttendanceReports);
exports.default = router;
//# sourceMappingURL=attendance.routes.js.map