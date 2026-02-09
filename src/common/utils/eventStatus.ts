import { EventStatus } from "../../modules/Event/event.Model";

export const calculateEventStatus = (
  date: Date,
  time: string,
  currentStatus: EventStatus
): EventStatus => {

  // ❌ Never auto-change cancelled events
  if (currentStatus === EventStatus.CANCELLED) {
    return EventStatus.CANCELLED;
  }

  const now = new Date();

  // Build event start datetime
  const [hours, minutes] = time.split(":").map(Number);
  const eventStart = new Date(date);
  eventStart.setHours(hours, minutes, 0, 0);

  // Assume duration = 2 hours (change if needed)
  const eventEnd = new Date(eventStart);
  eventEnd.setHours(eventEnd.getHours() + 2);

  if (now < eventStart) {
    return EventStatus.UPCOMING;
  }

  if (now >= eventStart && now <= eventEnd) {
    return EventStatus.ONGOING;
  }

  return EventStatus.FINISHED;
};
