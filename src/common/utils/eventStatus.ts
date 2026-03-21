import { EventStatus } from "../../modules/Event/event.Model";

export const calculateEventStatus = (
  date: Date,
  time: string,
  endTime: string, // ✅ NEW
  currentStatus: EventStatus
): EventStatus => {

  if (currentStatus === EventStatus.CANCELLED) {
    return EventStatus.CANCELLED;
  }

  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
  );

  const [startH, startM] = time.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);

  const localDate = new Date(date);

  const eventStart = new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    startH,
    startM,
    0,
    0
  );

  const eventEnd = new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    endH,
    endM,
    0,
    0
  );

  if (now < eventStart) return EventStatus.UPCOMING;
  if (now <= eventEnd) return EventStatus.ONGOING;

  return EventStatus.FINISHED;
};