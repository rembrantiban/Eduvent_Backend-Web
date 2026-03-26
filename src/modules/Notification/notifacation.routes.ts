import express from "express"
import { createAnnouncement, getAnnouncements, getAllNotifications } from "./notification.controller"
import { requireAuth } from "../../common/middleware/authmiddleware"
import { MobileAuth } from "../../middleware/AuthCookieMiddleware"

const router = express.Router()

router.post("/createannouncements", requireAuth, createAnnouncement)
router.get("/getannouncements", MobileAuth, getAnnouncements)
router.get("/getallnotifications", requireAuth, getAllNotifications)

export default router