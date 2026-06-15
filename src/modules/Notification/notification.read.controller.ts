import { NotificationRead } from "./notification.read.model";

export const markNotificationAsRead = async (req: any, res: any) => {
  try {
    const { notificationId } = req.params;

    await NotificationRead.findOneAndUpdate(
      {
        notificationId,
        userId: req.user._id,
      },
      {
        readAt: new Date(),
      },
      {
        upsert: true,
        new: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
    });
  }
};