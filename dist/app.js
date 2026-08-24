"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const user_Routes_1 = __importDefault(require("./modules/User/user.Routes"));
const event_routes_1 = __importDefault(require("./modules/Event/event.routes"));
const mongoose_1 = __importDefault(require("mongoose"));
const location_routes_1 = __importDefault(require("./modules/Location/location.routes"));
const department_routes_1 = __importDefault(require("./modules/Department/department.routes"));
const attendance_routes_1 = __importDefault(require("./modules/Attendance/attendance.routes"));
const notifacation_routes_1 = __importDefault(require("./modules/Notification/notifacation.routes"));
const app = (0, express_1.default)();
app.set("trust proxy", 1);
app.get("/api/health", (req, res) => {
    const dbReady = mongoose_1.default.connection.readyState === 1;
    res.status(dbReady ? 200 : 500).json({
        status: dbReady ? "OK" : "ERROR",
        db: dbReady,
    });
});
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        const allowedOrigins = [
            process.env.CLIENT_URL?.replace(/\/$/, ""),
            "http://localhost:5173",
            "http://192.168.100.45:8081"
        ];
        const normalizedOrigin = origin?.replace(/\/$/, "");
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(normalizedOrigin)) {
            callback(null, true);
        }
        else {
            console.log("CORS blocked:", origin);
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.get("/", (req, res) => {
    res.send("API is running...");
});
app.get("/api/ping", (req, res) => {
    res.json({ ok: true });
});
app.use("/api/auth", user_Routes_1.default);
app.use("/api/event", event_routes_1.default);
app.use("/api/location", location_routes_1.default);
app.use("/api/course", department_routes_1.default);
app.use("/api/attendance", attendance_routes_1.default);
app.use("/api/notifications", notifacation_routes_1.default);
exports.default = app;
//# sourceMappingURL=app.js.map