import express from 'express';
import {
    createEvent,
    getEvents,
    updateEvent,
    deleteEvent,
    updateEventStatusToCanceled,
    getUpComingEvents,
    getFinishedEvents,
    getTotalUpComingEvents,
    getStudentEvents,
} from './event.Controller';
import uploadImage from '../../middleware/multer';
import MobileAuth from '../../middleware/AuthCookieMiddleware';

const router = express.Router();

router.post('/createEvent', uploadImage.single('image'), createEvent);
router.get('/getEvents', getEvents);
router.put('/updateEvent/:id', uploadImage.single('image'), updateEvent);
router.put('/updateEventStatusToCanceled/:id', updateEventStatusToCanceled);
router.get("/upcomingEvents", getUpComingEvents );
router.get("/totalUpcomingEvents", getTotalUpComingEvents );
router.get("/finishedEvent", getFinishedEvents );
router.get("/studentEvents", MobileAuth, getStudentEvents );    
router.delete('/deleteEvent/:id', deleteEvent);

export default router;