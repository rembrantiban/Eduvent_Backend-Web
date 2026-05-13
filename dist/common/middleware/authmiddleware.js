"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_Model_1 = require("../../modules/User/user.Model");
const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "defaultsecret");
        const user = await user_Model_1.User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        req.user = {
            ...user.toObject(),
            _id: user._id.toString(),
        };
        next();
    }
    catch (err) {
        console.error("Auth error:", err);
        return res.status(401).json({ message: "Invalid token" });
    }
};
exports.requireAuth = requireAuth;
//# sourceMappingURL=authmiddleware.js.map