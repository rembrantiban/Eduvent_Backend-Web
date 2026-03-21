import { EventStatus } from "../../modules/Event/event.Model";

export const calculateEventStatus = (
  date: Date,
  time: string,
  currentStatus: EventStatus
): EventStatus => {

  if (currentStatus === EventStatus.CANCELLED) {
    return EventStatus.CANCELLED;
  }

const now = new Date(
  new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" })
);

  const [hours, minutes] = time.split(":").map(Number);

  const localDate = new Date(date);
  const eventStart = new Date(
    localDate.getFullYear(),
    localDate.getMonth(),
    localDate.getDate(),
    hours,
    minutes,
    0,
    0
  );

  const eventEnd = new Date(eventStart);
  eventEnd.setHours(eventEnd.getHours() + 2);

  if (now < eventStart) return EventStatus.UPCOMING;
  if (now <= eventEnd) return EventStatus.ONGOING;

  return EventStatus.FINISHED;
};