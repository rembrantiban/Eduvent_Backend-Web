import express from "express"
import { createAnnouncement, getAnnouncements } from "./notification.controller"
import { requireAuth } from "../../common/middleware/authmiddleware"

const router = express.Router()

router.post("/createannouncements", requireAuth, createAnnouncement)
router.get("/getannouncements", requireAuth, getAnnouncements)

export default router