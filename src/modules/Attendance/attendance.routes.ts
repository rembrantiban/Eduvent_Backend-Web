import { Router } from "express";
import multer from "multer";
import { AttendanceController} from "./attendance.Controller";
import MobileAuth from "../../middleware/AuthCookieMiddleware"

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
});

router.post(
  "/record",
  upload.single("image"),
  AttendanceController.recordAttendance
);
router.get("/get-event-attendance/:eventId", AttendanceController.getEventAttendance);
router.get("/get-events-with-attendance", AttendanceController.getEventsWithAttendance);
router.get("/dashboard-stats/:userId", AttendanceController.getStudentDashboardStats);
router.get("/get-all-attendance-ongoing",MobileAuth, AttendanceController.getAllAttendanceOngoing);
export default router;