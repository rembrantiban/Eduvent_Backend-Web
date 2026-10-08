import { QueryFilter } from "mongoose";
import { Notification, INotification, NotificationCategory } from "./notification.model";
import { User, IUser, NOT_DELETED } from "../User/user.Model";
import { IEvent } from "../Event/event.Model";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const PUSH_CHUNK_SIZE = 100;

/* Students with a push token who are eligible for the event (or everyone if no event) */
export const findTargetStudents = async (
  event: IEvent | null
): Promise<IUser[]> => {
  const query: QueryFilter<IUser> = {
    role: "student",
    pushToken: { $ne: null },
  };

  if (event && !event.isForAllStudents) {
    const and: QueryFilter<IUser>[] = [];

    if (event.targetDepartments?.length)
      and.push({ course: { $in: event.targetDepartments } });

    if (event.targetYearLevels?.length)
      and.push({ yearLevel: { $in: event.targetYearLevels } });

    if (event.targetMajors?.length)
      and.push({ major: { $in: event.targetMajors } });

    if (event.targetSections?.length)
      and.push({ section: { $in: event.targetSections } });

    if (and.length) query.$and = and;
  }

  return User.find({ ...query, ...NOT_DELETED });
};

interface SendNotificationOptions {
  title: string;
  message: string;
  category: NotificationCategory;
  event: IEvent | null;
  senderId?: string;
  senderName?: string;
}

/* Saves the notification and pushes it to every matching student */
export const createAndPushNotification = async ({
  title,
  message,
  category,
  event,
  senderId,
  senderName,
}: SendNotificationOptions): Promise<{
  notification: INotification;
  totalRecipients: number;
}> => {
  const students = await findTargetStudents(event);

  const data = event
    ? { screen: "EventDetails", eventId: event._id.toString() }
    : { screen: "Announcements" };

  const notification = await Notification.create({
    title,
    message,
    category,
    sender: senderId,
    eventId: event?._id,
    data,
  });

  const messages = students.map((user) => ({
    to: user.pushToken as string,
    sound: "default",
    title,
    body: message,
    data: {
      ...data,
      notificationId: notification._id.toString(),
      category,
      senderName,
    },
  }));

  for (let i = 0; i < messages.length; i += PUSH_CHUNK_SIZE) {
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages.slice(i, i + PUSH_CHUNK_SIZE)),
    });
  }

  return { notification, totalRecipients: students.length };
};

/* Tells the eligible participants that a new event was created */
export const notifyEventCreated = (
  event: IEvent,
  senderId?: string,
  senderName?: string
): Promise<{ notification: INotification; totalRecipients: number }> => {
  const when = new Date(event.date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return createAndPushNotification({
    title: `New event: ${event.title}`,
    message: `${event.title} is scheduled on ${when}, ${event.time} - ${event.endTime}. Tap to view the details.`,
    category: "event",
    event,
    senderId,
    senderName,
  });
};
