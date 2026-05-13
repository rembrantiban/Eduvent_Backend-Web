"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEventStatus = void 0;
const event_Model_1 = require("../../modules/Event/event.Model");
const calculateEventStatus = (date, time, endTime, // ✅ NEW
currentStatus) => {
    if (currentStatus === event_Model_1.EventStatus.CANCELLED) {
        return event_Model_1.EventStatus.CANCELLED;
    }
    const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" }));
    const [startH, startM] = time.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const localDate = new Date(date);
    const eventStart = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), startH, startM, 0, 0);
    const eventEnd = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate(), endH, endM, 0, 0);
    if (now < eventStart)
        return event_Model_1.EventStatus.UPCOMING;
    if (now <= eventEnd)
        return event_Model_1.EventStatus.ONGOING;
    return event_Model_1.EventStatus.FINISHED;
};
exports.calculateEventStatus = calculateEventStatus;
//# sourceMappingURL=eventStatus.js.map