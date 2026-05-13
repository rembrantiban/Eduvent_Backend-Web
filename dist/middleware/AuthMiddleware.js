"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthCookieMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_Model_1 = require("../modules/User/user.Model");
const AuthCookieMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies["user_token"]; // ✅ match cookie name
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "defaultsecret");
        const user = await user_Model_1.User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        req.user = user; // full user object
        next();
    }
    catch {
        return res.status(401).json({ message: "Invalid token" });
    }
};
exports.AuthCookieMiddleware = AuthCookieMiddleware;
//# sourceMappingURL=AuthMiddleware.js.map