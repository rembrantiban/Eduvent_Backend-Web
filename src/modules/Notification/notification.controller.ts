import { Request, Response } from "express";
import { Notification } from "./notification.model";
import { User } from "../User/user.Model";

export const createAnnouncement = async (req: Request, res: Response) => {
  try {
    const { title, message } = req.body;

    // 1. Save notification
    const notification = await Notification.create({
      title,
      message,
      sender: req.user?._id, // ✅ FIXED
      data: {
        screen: "Announcements",
      },
    });

    // 2. Get students
    const students = await User.find({
      role: "student",
      pushToken: { $ne: null },
    });

    // 3. Prepare messages
    const messages = students.map((user) => ({
      to: user.pushToken as string, // ✅ TS fix
      sound: "default",
      title,
      body: message,
      data: {
        screen: "Announcements",
      },
    }));

    // 4. Send push
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    res.status(200).json({
      success: true,
      message: "Notification sent to all students",
      notification,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Failed to send notification",
    });
  }
};