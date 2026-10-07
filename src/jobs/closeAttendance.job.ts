import cron from "node-cron";
import { Event, NOT_DELETED } from "../modules/Event/event.Model";
import { isPastCloseTime } from "../common/utils/attendanceWindow";

/**
 * Runs every minute and flips `isClosed` to true for every event whose
 * attendance window (end time + attendanceCloseAfterMinutes) has passed.
 */
export const closeExpiredAttendance = async () => {
  const candidates = await Event.find({
    isClosed: false,
    attendanceCloseAfterMinutes: { $gt: 0 },
    ...NOT_DELETED,
  }).select("date time endTime attendanceCloseAfterMinutes");

  const now = new Date();

  const expiredIds = candidates
    .filter((event) => isPastCloseTime(event, now))
    .map((event) => event._id);

  if (expiredIds.length === 0) return;

  await Event.updateMany(
    { _id: { $in: expiredIds } },
    { $set: { isClosed: true } }
  );

  console.log(
    `[CRON] Closed attendance for ${expiredIds.length} event(s)`
  );
};

export const startCloseAttendanceJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      await closeExpiredAttendance();
    } catch (error) {
      console.error("[CRON] close attendance failed:", error);
    }
  });

  console.log("[CRON] Close-attendance job scheduled (every minute)");
};
