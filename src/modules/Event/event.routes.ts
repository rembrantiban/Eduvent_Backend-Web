import express from 'express';
import {
    createEvent,
    getEvents,
    updateEvent,
    deleteEvent,
    restoreEvent,
    updateEventStatusToCanceled,
    getUpComingEvents,
    getFinishedEvents,
    getTotalUpComingEvents,
    getStudentEvents,
    getTotalOngoingEvents,
    getEventTrends,
    getEventStatusAnalytics,
    getFinishedEventTitles,
} from './event.Controller';
import uploadImage from '../../middleware/multer';
import MobileAuth from '../../middleware/AuthCookieMiddleware';
import { requireAuth } from '../../common/middleware/authmiddleware';

const router = express.Router();

router.post('/createEvent', requireAuth, uploadImage.single('image'), createEvent);
router.get('/getEvents', getEvents);
router.put('/updateEvent/:id', uploadImage.single('image'), updateEvent);
router.put('/updateEventStatusToCanceled/:id', updateEventStatusToCanceled);
router.get("/upcomingEvents", getUpComingEvents );
router.get("/totalUpcomingEvents", getTotalUpComingEvents );
router.get("/finishedEvent", getFinishedEvents );
router.get("/studentEvents", MobileAuth, getStudentEvents );    
router.delete('/deleteEvent/:id', deleteEvent);
router.put('/restoreEvent/:id', restoreEvent);
router.get("/ongoingEvents", getTotalOngoingEvents);
router.get("/eventTrends", getEventTrends);
router.get("/eventStatusAnalytics", getEventStatusAnalytics);
router.get("/finishedEventTitles", getFinishedEventTitles);


export default router;