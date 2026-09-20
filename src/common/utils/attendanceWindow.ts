/**
 * Attendance window helpers.
 *
 * An event's attendance closes `attendanceCloseAfterMinutes` after its END
 * time. Once closed, neither time-in nor time-out is accepted.
 * `attendanceCloseAfterMinutes === 0` means it never closes automatically.
 */

interface WindowEvent {
  date: Date;
  time: string;
  endTime?: string;
  attendanceCloseAfterMinutes?: number;
}

const atTime = (date: Date, time: string): Date => {
  const [h, m] = (time || "0:0").split(":").map(Number);
  const d = new Date(date);

  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
    h || 0,
    m || 0,
    0,
    0
  );
};

export const getEventStart = (date: Date, time: string): Date =>
  atTime(date, time);

export const getEventEnd = (
  date: Date,
  time: string,
  endTime?: string
): Date => {
  // No end time saved: assume the event lasts one hour (same as the
  // event controller).
  if (!endTime || !endTime.includes(":")) {
    return new Date(getEventStart(date, time).getTime() + 60 * 60 * 1000);
  }

  const start = getEventStart(date, time);
  const end = atTime(date, endTime);

  // Event ends after midnight
  if (end < start) end.setDate(end.getDate() + 1);

  return end;
};

export const getCloseAt = (event: WindowEvent): Date | null => {
  const minutes = event.attendanceCloseAfterMinutes ?? 0;

  if (minutes <= 0) return null;

  return new Date(
    getEventEnd(event.date, event.time, event.endTime).getTime() +
      minutes * 60 * 1000
  );
};

export const isPastCloseTime = (
  event: WindowEvent,
  now: Date = new Date()
): boolean => {
  const closeAt = getCloseAt(event);

  return closeAt !== null && now.getTime() > closeAt.getTime();
};
