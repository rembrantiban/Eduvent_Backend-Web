"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
dotenv_1.default.config();
(0, db_1.connectDB)();
const PORT = Number(process.env.PORT) || 3000;
// console.log("Resend API Key:", !!process.env.RESEND_API_KEY);
// console.log("FACEPP_KEY =", process.env.FACEPP_KEY);
// console.log("FACEPP_SECRET =", process.env.FACEPP_SECRET);
async function startServer() {
    try {
        await (0, db_1.connectDB)();
        app_1.default.listen(PORT, "0.0.0.0", () => {
            console.log(`Server is running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error("Server failed to start", error);
    }
}
startServer();
//# sourceMappingURL=server.js.map