import { EventStatus } from "../../modules/Event/event.Model";

export const calculateEventStatus = (
  date: Date,
  time: string,
  currentStatus?: EventStatus
): EventStatus => {
  // Do NOT override cancelled events
  if (currentStatus === EventStatus.CANCELLED) {
    return EventStatus.CANCELLED;
  }

  const now = new Date();

  // Combine date + time
  const [hours, minutes] = time.split(":").map(Number);
  const eventDateTime = new Date(date);
  eventDateTime.setHours(hours, minutes, 0, 0);

  if (now < eventDateTime) {
    return EventStatus.UPCOMING;
  }

  // Assume event duration is 2 hours (adjust if needed)
  const eventEndTime = new Date(eventDateTime);
  eventEndTime.setHours(eventEndTime.getHours() + 2);

  if (now >= eventDateTime && now <= eventEndTime) {
    return EventStatus.ONGOING;
  }

  return EventStatus.FINISHED;
};
