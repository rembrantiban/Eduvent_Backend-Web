"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireCompleteProfile = void 0;
const requireCompleteProfile = (req, res, next) => {
    if (req.user.role === "student" &&
        (!req.user.yearLevel ||
            !req.user.course ||
            !req.user.section)) {
        return res.status(403).json({
            message: "Please complete your profile first",
        });
    }
    next();
};
exports.requireCompleteProfile = requireCompleteProfile;
//# sourceMappingURL=requireCompleteProfile.js.map