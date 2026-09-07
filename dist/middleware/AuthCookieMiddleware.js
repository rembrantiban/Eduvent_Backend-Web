"use strict";
// this for mobile AuthCookie middleware
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_Model_1 = require("../modules/User/user.Model");
const MobileAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        console.log("AUTH HEADER:", authHeader);
        if (!authHeader) {
            return res.status(401).json({ message: "Unauthorized: No header" });
        }
        const token = authHeader.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized: Token missing" });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "defaultsecret");
        console.log("DECODED TOKEN:", decoded);
        const user = await user_Model_1.User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
        req.user = user;
        next();
    }
    catch (error) {
        // Only a genuinely bad/expired token is an auth failure (401). Anything
        // else here (e.g. a transient DB error on User.findById) must NOT sign the
        // user out — the mobile client treats 401 as "session expired".
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError ||
            error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            console.error("JWT ERROR:", error);
            return res.status(401).json({ message: "Invalid token" });
        }
        console.error("AUTH MIDDLEWARE ERROR:", error);
        return res.status(500).json({ message: "Authentication check failed" });
    }
};
exports.MobileAuth = MobileAuth;
exports.default = exports.MobileAuth;
//# sourceMappingURL=AuthCookieMiddleware.js.map