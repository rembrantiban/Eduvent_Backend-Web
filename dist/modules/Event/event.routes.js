"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const event_Controller_1 = require("./event.Controller");
const multer_1 = __importDefault(require("../../middleware/multer"));
const AuthCookieMiddleware_1 = __importDefault(require("../../middleware/AuthCookieMiddleware"));
const router = express_1.default.Router();
router.post('/createEvent', multer_1.default.single('image'), event_Controller_1.createEvent);
router.get('/getEvents', event_Controller_1.getEvents);
router.put('/updateEvent/:id', multer_1.default.single('image'), event_Controller_1.updateEvent);
router.put('/updateEventStatusToCanceled/:id', event_Controller_1.updateEventStatusToCanceled);
router.get("/upcomingEvents", event_Controller_1.getUpComingEvents);
router.get("/totalUpcomingEvents", event_Controller_1.getTotalUpComingEvents);
router.get("/finishedEvent", event_Controller_1.getFinishedEvents);
router.get("/studentEvents", AuthCookieMiddleware_1.default, event_Controller_1.getStudentEvents);
router.delete('/deleteEvent/:id', event_Controller_1.deleteEvent);
router.get("/ongoingEvents", event_Controller_1.getTotalOngoingEvents);
router.get("/eventTrends", event_Controller_1.getEventTrends);
router.get("/eventStatusAnalytics", event_Controller_1.getEventStatusAnalytics);
router.get("/finishedEventTitles", event_Controller_1.getFinishedEventTitles);
exports.default = router;
//# sourceMappingURL=event.routes.js.map