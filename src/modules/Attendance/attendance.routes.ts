import { Router } from "express";
import multer from "multer";
import { AttendanceController } from "./attendance.Controller";
import { getAttendanceAnalytics } from "./attendance.analytics.controller"
import MobileAuth from "../../middleware/AuthCookieMiddleware"
import { requireAuth } from "../../common/middleware/authmiddleware";
const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post(
  "/record",
  MobileAuth,
  upload.single("image"),
  (req, res, next) => {
    console.log("ROUTE HIT");
    next();
  },
  AttendanceController.recordAttendance
);
router.get("/get-event-attendance/:eventId", AttendanceController.getEventAttendance);
router.get("/get-events-with-attendance", AttendanceController.getEventsWithAttendance);
router.get("/get-all-attendance-ongoing", MobileAuth, AttendanceController.getAllAttendanceOngoing);
router.get("/my-attendance-history", MobileAuth, AttendanceController.getMyAttendanceHistory);
router.get("/dashboard-stats", MobileAuth, AttendanceController.getStudentDashboardStats);
router.get("/analytics/:eventId", requireAuth, getAttendanceAnalytics);

export default router;