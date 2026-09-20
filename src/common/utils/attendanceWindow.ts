/**
 * Attendance window helpers.
 *
 * An event's attendance closes `attendanceCloseAfterMinutes` after its start
 * time. Once closed, neither time-in nor time-out is accepted.
 * `attendanceCloseAfterMinutes === 0` means it never closes automatically.
 */

interface WindowEvent {
  date: Date;
  time: string;
  attendanceCloseAfterMinutes?: number;
}

export const getEventStart = (date: Date, time: string): Date => {
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

export const getCloseAt = (event: WindowEvent): Date | null => {
  const minutes = event.attendanceCloseAfterMinutes ?? 0;

  if (minutes <= 0) return null;

  return new Date(
    getEventStart(event.date, event.time).getTime() +
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
