import express from 'express';
import {
    createEvent,
    getEvents,
    updateEvent,
    deleteEvent,
} from './event.Controller';

const router = express.Router();

router.post('/createEvent', createEvent);
router.get('/getEvents', getEvents);
router.put('/updateEvent/:id', updateEvent);
router.delete('/deleteEvent/:id', deleteEvent);

export default router;