import { Router } from "express";
import multer from "multer";
import { AttendanceController} from "./attendance.Controller";

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
export default router;