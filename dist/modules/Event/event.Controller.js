"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFinishedEventTitles = exports.getEventStatusAnalytics = exports.getEventTrends = exports.getTotalOngoingEvents = exports.getTotalUpComingEvents = exports.getFinishedEvents = exports.getUpComingEvents = exports.updateEventStatusToCanceled = exports.deleteEvent = exports.updateEvent = exports.getStudentEvents = exports.getEvents = exports.createEvent = void 0;
const event_Model_1 = require("./event.Model");
const cloudinary_1 = __importDefault(require("../../config/cloudinary"));
const mongoose_1 = __importDefault(require("mongoose"));
const createEvent = async (req, res) => {
    const parsedTargetDepartments = typeof req.body.targetDepartments === "string"
        ? JSON.parse(req.body.targetDepartments)
        : [];
    const parsedTargetMajors = typeof req.body.targetMajors === "string"
        ? JSON.parse(req.body.targetMajors)
        : [];
    const parsedTargetYearLevels = typeof req.body.targetYearLevels === "string"
        ? JSON.parse(req.body.targetYearLevels)
        : [];
    const parsedTargetSections = typeof req.body.targetSections === "string"
        ? JSON.parse(req.body.targetSections)
        : [];
    try {
        const { title, description, date, time, endTime, locationId, 
        /* NEW */
        targetDepartments, targetYearLevels, targetMajors, targetSections, isForAllStudents, } = req.body;
        if (!title ||
            !description ||
            !date ||
            !time ||
            !locationId) {
            return res.status(400).json({
                message: "Please provide all required fields.",
            });
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(locationId)) {
            return res.status(400).json({
                message: "Invalid locationId.",
            });
        }
        const parseDate = new Date(date);
        parseDate.setHours(0, 0, 0, 0);
        if (time === endTime) {
            return res.status(400).json({
                message: "Start time and end time cannot be the same.",
            });
        }
        let imageUrl;
        if (req.file) {
            const uploadResult = await new Promise((resolve, reject) => {
                cloudinary_1.default.uploader
                    .upload_stream({
                    folder: "events",
                    resource_type: "image",
                }, (error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve(result);
                })
                    .end(req.file.buffer);
            });
            imageUrl = uploadResult.secure_url;
        }
        const now = new Date(new Date().toLocaleString("en-US", {
            timeZone: "Asia/Manila",
        }));
        const safeParseTime = (t) => {
            if (!t || !t.includes(":"))
                return [0, 0];
            return t.split(":").map(Number);
        };
        const [startH, startM] = safeParseTime(time);
        let [endH, endM] = safeParseTime(endTime);
        if (!endTime) {
            endH = startH + 1;
            endM = startM;
        }
        const eventStart = new Date(parseDate.getFullYear(), parseDate.getMonth(), parseDate.getDate(), startH, startM);
        const eventEnd = new Date(parseDate.getFullYear(), parseDate.getMonth(), parseDate.getDate(), endH, endM);
        if (eventEnd < eventStart) {
            eventEnd.setDate(eventEnd.getDate() + 1);
        }
        let status = event_Model_1.EventStatus.UPCOMING;
        if (now < eventStart) {
            status = event_Model_1.EventStatus.UPCOMING;
        }
        else if (now <= eventEnd) {
            status = event_Model_1.EventStatus.ONGOING;
        }
        else {
            status = event_Model_1.EventStatus.FINISHED;
        }
        const newEvent = new event_Model_1.Event({
            imageUrl,
            title,
            description,
            date: parseDate,
            time,
            endTime,
            locationId,
            status,
            /* NEW TARGETING */
            targetDepartments: parsedTargetDepartments,
            targetYearLevels: parsedTargetYearLevels,
            targetMajors: parsedTargetMajors,
            targetSections: parsedTargetSections,
            isForAllStudents: isForAllStudents === "true",
        });
        const savedEvent = await newEvent.save();
        const populatedEvent = await savedEvent.populate("locationId");
        return res.status(201).json({
            success: true,
            data: populatedEvent,
        });
    }
    catch (err) {
        console.error(err, "Error in createEvent");
        return res.status(500).json({
            message: "Server error",
        });
    }
};
exports.createEvent = createEvent;
const getEvents = async (req, res) => {
    try {
        const events = await event_Model_1.Event.find()
            .populate("locationId")
            .sort({ createdAt: -1 });
        const bulkOps = [];
        const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        const updatedEvents = events.map((event) => {
            let startH = 0, startM = 0;
            let endH = 0, endM = 0;
            if (event.time && event.time.includes(":")) {
                [startH, startM] = event.time.split(":").map(Number);
            }
            if (event.endTime && event.endTime.includes(":")) {
                [endH, endM] = event.endTime.split(":").map(Number);
            }
            else {
                endH = startH + 1;
                endM = startM;
            }
            const eventStart = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate(), startH, startM, 0, 0);
            const eventEnd = new Date(event.date.getFullYear(), event.date.getMonth(), event.date.getDate(), endH, endM, 0, 0);
            let newStatus = event_Model_1.EventStatus.UPCOMING;
            if (event.status === event_Model_1.EventStatus.CANCELLED) {
                newStatus = event_Model_1.EventStatus.CANCELLED;
            }
            else if (now >= eventStart && now <= eventEnd) {
                newStatus = event_Model_1.EventStatus.ONGOING;
            }
            else if (now > eventEnd) {
                newStatus = event_Model_1.EventStatus.FINISHED;
            }
            if (event.status !== newStatus) {
                bulkOps.push({
                    updateOne: {
                        filter: { _id: event._id },
                        update: { status: newStatus },
                    },
                });
                event.status = newStatus;
            }
            return event;
        });
        if (bulkOps.length > 0) {
            await event_Model_1.Event.bulkWrite(bulkOps);
        }
        return res.status(200).json({
            success: true,
            data: updatedEvents,
        });
    }
    catch (err) {
        console.error("Error in getEvents:", err);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.getEvents = getEvents;
const getStudentEvents = async (req, res) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        const events = await event_Model_1.Event.find({
            $or: [
                {
                    isForAllStudents: true,
                },
                {
                    targetDepartments: {
                        $in: [user.course],
                    },
                },
                {
                    targetMajors: {
                        $in: [user.major],
                    },
                },
                {
                    targetYearLevels: {
                        $in: [user.yearLevel],
                    },
                },
                {
                    targetSections: {
                        $in: [user.section],
                    },
                },
            ],
        })
            .select(`
        title
        description
        date
        time
        endTime
        status
        imageUrl
        locationId
      `)
            .populate({
            path: "locationId",
            select: `
    venue
    location
    latitude
    longitude
  `,
        })
            .sort({
            date: 1,
        })
            .lean();
        return res.status(200).json({
            success: true,
            data: events,
        });
    }
    catch (error) {
        console.error("Error fetching student events", error);
        return res.status(500).json({
            message: "Server error",
        });
    }
};
exports.getStudentEvents = getStudentEvents;
const updateEvent = async (req, res) => {
    const parsedTargetDepartments = typeof req.body.targetDepartments === "string"
        ? JSON.parse(req.body.targetDepartments)
        : [];
    const parsedTargetMajors = typeof req.body.targetMajors === "string"
        ? JSON.parse(req.body.targetMajors)
        : [];
    const parsedTargetYearLevels = typeof req.body.targetYearLevels === "string"
        ? JSON.parse(req.body.targetYearLevels)
        : [];
    const parsedTargetSections = typeof req.body.targetSections === "string"
        ? JSON.parse(req.body.targetSections)
        : [];
    try {
        const eventId = req.params.id;
        const { title, description, date, time, endTime, locationId, 
        /* NEW */
        targetDepartments, targetYearLevels, targetMajors, targetSections, isForAllStudents, } = req.body;
        const event = await event_Model_1.Event.findById(eventId);
        if (!event) {
            return res.status(404).json({
                message: "Event not found",
            });
        }
        if (locationId &&
            !mongoose_1.default.Types.ObjectId.isValid(locationId)) {
            return res.status(400).json({
                message: "Invalid locationId.",
            });
        }
        if (time &&
            endTime &&
            time === endTime) {
            return res.status(400).json({
                message: "Start time and end time cannot be the same.",
            });
        }
        if (req.file) {
            const uploadResult = await new Promise((resolve, reject) => {
                cloudinary_1.default.uploader
                    .upload_stream({
                    folder: "events",
                    resource_type: "image",
                }, (error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve(result);
                })
                    .end(req.file.buffer);
            });
            event.imageUrl =
                uploadResult.secure_url;
        }
        if (title)
            event.title = title;
        if (description)
            event.description = description;
        if (date) {
            const parsed = new Date(date);
            parsed.setHours(0, 0, 0, 0);
            event.date = parsed;
        }
        if (time)
            event.time = time;
        if (endTime)
            event.endTime = endTime;
        if (locationId)
            event.locationId = locationId;
        /* NEW TARGETING */
        event.targetDepartments =
            parsedTargetDepartments;
        event.targetYearLevels =
            parsedTargetYearLevels;
        event.targetMajors =
            parsedTargetMajors;
        event.targetSections =
            parsedTargetSections;
        event.isForAllStudents =
            isForAllStudents === "true";
        const now = new Date(new Date().toLocaleString("en-US", {
            timeZone: "Asia/Manila",
        }));
        const safeParseTime = (t) => {
            if (!t || !t.includes(":"))
                return [0, 0];
            return t.split(":").map(Number);
        };
        const [startH, startM] = safeParseTime(event.time);
        let [endH, endM] = safeParseTime(event.endTime);
        if (!event.endTime) {
            endH = startH + 1;
            endM = startM;
        }
        const baseDate = new Date(event.date);
        const eventStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), startH, startM);
        const eventEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), endH, endM);
        if (eventEnd < eventStart) {
            eventEnd.setDate(eventEnd.getDate() + 1);
        }
        let newStatus = event_Model_1.EventStatus.UPCOMING;
        if (event.status ===
            event_Model_1.EventStatus.CANCELLED) {
            newStatus =
                event_Model_1.EventStatus.CANCELLED;
        }
        else if (now < eventStart) {
            newStatus =
                event_Model_1.EventStatus.UPCOMING;
        }
        else if (now <= eventEnd) {
            newStatus =
                event_Model_1.EventStatus.ONGOING;
        }
        else {
            newStatus =
                event_Model_1.EventStatus.FINISHED;
        }
        event.status = newStatus;
        /* SAVE */
        const updatedEvent = await event.save();
        const populatedEvent = await updatedEvent.populate("locationId");
        return res.status(200).json({
            success: true,
            data: populatedEvent,
        });
    }
    catch (err) {
        console.error("Error in updateEvent", err);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.updateEvent = updateEvent;
const getPublicIdFromUrl = (url) => {
    try {
        const parts = url.split("/");
        const uploadIndex = parts.findIndex((p) => p === "upload");
        if (uploadIndex === -1)
            return null;
        // Skip "upload" and version (v123456)
        const publicIdWithExt = parts
            .slice(uploadIndex + 2)
            .join("/")
            .split(".")[0];
        return publicIdWithExt;
    }
    catch {
        return null;
    }
};
const deleteEvent = async (req, res) => {
    try {
        const eventId = req.params.id;
        const event = await event_Model_1.Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        if (event.imageUrl) {
            const publicId = getPublicIdFromUrl(event.imageUrl);
            if (publicId) {
                await cloudinary_1.default.uploader.destroy(publicId, {
                    resource_type: "image",
                });
            }
        }
        await event.deleteOne();
        return res.status(200).json({
            success: true,
            message: "Event and image deleted successfully",
        });
    }
    catch (err) {
        console.error("Error in deleteEvent", err);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.deleteEvent = deleteEvent;
const updateEventStatusToCanceled = async (req, res) => {
    try {
        const eventId = req.params.id;
        const event = await event_Model_1.Event.findById(eventId);
        if (event?.status === event_Model_1.EventStatus.FINISHED) {
            return res.status(400).json({ message: "Cannot cancel a finished event" });
        }
        if (event?.status === event_Model_1.EventStatus.CANCELLED) {
            return res.status(400).json({ message: "Event is already cancelled" });
        }
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }
        event.status = event_Model_1.EventStatus.CANCELLED; // ✅ matches enum
        await event.save();
        return res.status(200).json({
            success: true,
            message: "Event status updated to Cancelled",
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.updateEventStatusToCanceled = updateEventStatusToCanceled;
const getUpComingEvents = async (req, res) => {
    try {
        const upComingEvents = await event_Model_1.Event.find({
            status: event_Model_1.EventStatus.UPCOMING,
        }).populate("locationId");
        return res.status(200).json({
            success: true,
            data: upComingEvents,
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.getUpComingEvents = getUpComingEvents;
const getFinishedEvents = async (req, res) => {
    try {
        const finishedEvents = await event_Model_1.Event.find({
            status: event_Model_1.EventStatus.FINISHED,
        }).populate("locationId");
        return res.status(200).json({
            success: true,
            data: finishedEvents,
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.getFinishedEvents = getFinishedEvents;
const getTotalUpComingEvents = async (req, res) => {
    try {
        const upComingEvents = await event_Model_1.Event.find({
            status: event_Model_1.EventStatus.UPCOMING,
        }).populate("locationId");
        return res.status(200).json({
            success: true,
            data: upComingEvents,
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.getTotalUpComingEvents = getTotalUpComingEvents;
const getTotalOngoingEvents = async (req, res) => {
    try {
        const onGoingEvents = await event_Model_1.Event.find({
            status: event_Model_1.EventStatus.ONGOING,
        }).populate("locationId");
        return res.status(200).json({
            success: true,
            data: onGoingEvents,
        });
    }
    catch (err) {
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};
exports.getTotalOngoingEvents = getTotalOngoingEvents;
const getEventTrends = async (req, res) => {
    try {
        const { type = "weekly" } = req.query;
        if (type === "weekly") {
            const result = await event_Model_1.Event.aggregate([
                {
                    $group: {
                        _id: {
                            $dayOfWeek: "$date",
                        },
                        events: {
                            $sum: 1,
                        },
                    },
                },
            ]);
            const days = [
                "Sun",
                "Mon",
                "Tue",
                "Wed",
                "Thu",
                "Fri",
                "Sat",
            ];
            const data = days.map((day, index) => {
                const found = result.find((r) => r._id === index + 1);
                return {
                    label: day,
                    events: found?.events || 0,
                };
            });
            return res.json({
                success: true,
                data,
            });
        }
        if (type === "monthly") {
            const result = await event_Model_1.Event.aggregate([
                {
                    $group: {
                        _id: {
                            $month: "$date",
                        },
                        events: {
                            $sum: 1,
                        },
                    },
                },
            ]);
            const months = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ];
            const data = months.map((month, index) => {
                const found = result.find((r) => r._id === index + 1);
                return {
                    label: month,
                    events: found?.events || 0,
                };
            });
            return res.json({
                success: true,
                data,
            });
        }
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch trends",
        });
    }
};
exports.getEventTrends = getEventTrends;
const getEventStatusAnalytics = async (req, res) => {
    try {
        const completed = await event_Model_1.Event.countDocuments({
            status: event_Model_1.EventStatus.FINISHED,
        });
        const ongoing = await event_Model_1.Event.countDocuments({
            status: event_Model_1.EventStatus.ONGOING,
        });
        const upcoming = await event_Model_1.Event.countDocuments({
            status: event_Model_1.EventStatus.UPCOMING,
        });
        const cancelled = await event_Model_1.Event.countDocuments({
            status: event_Model_1.EventStatus.CANCELLED,
        });
        const total = completed +
            ongoing +
            upcoming +
            cancelled;
        const calculatePct = (value) => total > 0
            ? `${Math.round((value / total) * 100)}%`
            : "0%";
        const data = [
            {
                name: "Completed",
                value: completed,
                color: "#0f766e",
                pct: calculatePct(completed),
            },
            {
                name: "Ongoing",
                value: ongoing,
                color: "#ec4899",
                pct: calculatePct(ongoing),
            },
            {
                name: "Upcoming",
                value: upcoming,
                color: "#8b5cf6",
                pct: calculatePct(upcoming),
            },
            {
                name: "Cancelled",
                value: cancelled,
                color: "#facc15",
                pct: calculatePct(cancelled),
            },
        ];
        return res.status(200).json({
            success: true,
            data,
            total,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch event analytics",
        });
    }
};
exports.getEventStatusAnalytics = getEventStatusAnalytics;
const getFinishedEventTitles = async (req, res) => {
    try {
        const events = await event_Model_1.Event.find({ status: event_Model_1.EventStatus.FINISHED }, { title: 1, _id: 1 } // only return id and title
        ).sort({ date: -1 });
        return res.status(200).json({
            success: true,
            data: events,
        });
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to fetch finished events",
        });
    }
};
exports.getFinishedEventTitles = getFinishedEventTitles;
//# sourceMappingURL=event.Controller.js.map