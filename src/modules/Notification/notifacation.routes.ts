import express from "express"
import { sendEventNotification, getAnnouncements, getAllNotifications, countUserUnreadNotification, updateNotification, deleteNotification } from "./notification.controller"
import { requireAuth } from "../../common/middleware/authmiddleware"
import { MobileAuth } from "../../middleware/AuthCookieMiddleware"
import { markNotificationAsRead  } from "./notification.read.controller"

const router = express.Router()

router.post("/sendeventnotification", requireAuth, sendEventNotification)
router.get("/getannouncements", MobileAuth, getAnnouncements)
router.get("/getallnotifications", requireAuth, getAllNotifications)
router.patch("/markasread/:notificationId", MobileAuth, markNotificationAsRead)
router.get("/countunread", MobileAuth, countUserUnreadNotification)
router.put("/:id", requireAuth, updateNotification);
router.delete("/:id", requireAuth, deleteNotification);

export default router