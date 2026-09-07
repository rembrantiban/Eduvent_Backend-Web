"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceController = void 0;
const face_service_1 = require("./face.service");
const face_model_1 = require("./face.model");
const user_Model_1 = require("../User/user.Model");
const cloudinary_1 = __importDefault(require("../../config/cloudinary"));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
class FaceController {
    static async register(req, res) {
        try {
            const { userId, name } = req.body;
            const user = await user_Model_1.User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }
            if (user.isFaceRegistered) {
                return res.status(409).json({ message: "User already has registered face" });
            }
            if (!req.file) {
                return res.status(400).json({ message: "Image required" });
            }
            if (!userId || !name) {
                return res.status(400).json({ message: "userId and name required" });
            }
            // 1️⃣ Check if user already registered
            const existingUser = await face_model_1.FaceUser.findOne({ userId });
            if (existingUser) {
                return res.status(409).json({
                    message: "User already has registered face"
                });
            }
            // 2️⃣ Detect face
            const detect = await face_service_1.FaceService.detectFace(req.file.buffer);
            await delay(800);
            if (!detect.faces || detect.faces.length === 0) {
                return res.status(400).json({
                    message: "No face detected"
                });
            }
            const faceToken = detect.faces[0].face_token;
            // 3️⃣ Check if face already exists in FaceSet
            const search = await face_service_1.FaceService.searchFace(faceToken);
            if (search.results && search.results.length > 0) {
                const best = search.results[0];
                if (best.confidence > 90) {
                    const existingFace = await face_model_1.FaceUser.findOne({
                        faceToken: best.face_token
                    });
                    if (existingFace) {
                        return res.status(409).json({
                            message: "This face is already registered to another user"
                        });
                    }
                }
            }
            await delay(800);
            // 4️⃣ Add face to FaceSet
            await face_service_1.FaceService.addFace(faceToken);
            // 5️⃣ Upload the registered photo to Cloudinary
            const uploadResult = await new Promise((resolve, reject) => {
                cloudinary_1.default.uploader
                    .upload_stream({
                    folder: "faces",
                    resource_type: "image",
                }, (error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve(result);
                })
                    .end(req.file.buffer);
            });
            // 6️⃣ Save to database
            const faceUser = await face_model_1.FaceUser.create({
                userId,
                name,
                faceUrl: uploadResult.secure_url,
                cloudinaryId: uploadResult.public_id,
                faceToken,
            });
            await user_Model_1.User.findByIdAndUpdate(userId, {
                isFaceRegistered: true
            });
            return res.status(201).json({
                message: "Face registered successfully",
                data: faceUser,
                isFaceRegister: true
            });
        }
        catch (error) {
            console.error(error?.response?.data || error.message);
            return res.status(500).json({
                message: "Face registration failed please try again"
            });
        }
    }
    static async identify(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: "Image required" });
            }
            const detect = await face_service_1.FaceService.detectFace(req.file.buffer);
            if (!detect.faces || detect.faces.length === 0) {
                return res.status(404).json({
                    message: "No face detected"
                });
            }
            const faceToken = detect.faces[0].face_token;
            const search = await face_service_1.FaceService.searchFace(faceToken);
            if (!search.results || search.results.length === 0) {
                return res.status(404).json({
                    message: "No match found"
                });
            }
            const best = search.results[0];
            if (best.confidence < 80) {
                return res.status(401).json({
                    message: "Face not matched"
                });
            }
            const faceUser = await face_model_1.FaceUser.findOne({
                faceToken: best.face_token
            });
            if (!faceUser) {
                return res.status(404).json({
                    message: "Face exists in Face++ but not in database"
                });
            }
            return res.json({
                message: "Face identified",
                user: faceUser,
                confidence: best.confidence
            });
        }
        catch (error) {
            console.error(error?.response?.data || error.message);
            return res.status(500).json({
                message: "Face identification failed"
            });
        }
    }
}
exports.FaceController = FaceController;
//# sourceMappingURL=face.controller.js.map