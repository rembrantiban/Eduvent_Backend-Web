"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const face_controller_1 = require("./face.controller");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    limits: { fileSize: 5 * 1024 * 1024 }
});
router.post("/register", upload.single("image"), face_controller_1.FaceController.register);
router.post("/identify", upload.single("image"), face_controller_1.FaceController.identify);
exports.default = router;
//# sourceMappingURL=face.routes.js.map