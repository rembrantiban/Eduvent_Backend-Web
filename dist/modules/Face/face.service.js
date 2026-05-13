"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FaceService = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const FACEPP_URL = "https://api-us.faceplusplus.com/facepp/v3";
const API_KEY = process.env.FACEPP_KEY;
const API_SECRET = process.env.FACEPP_SECRET;
const FACESET_ID = "students";
class FaceService {
    static async detectFace(imageBuffer) {
        const formData = new form_data_1.default();
        formData.append("api_key", API_KEY);
        formData.append("api_secret", API_SECRET);
        formData.append("image_file", imageBuffer, "face.jpg");
        const res = await axios_1.default.post(`${FACEPP_URL}/detect`, formData, {
            headers: formData.getHeaders(),
        });
        return res.data;
    }
    static async searchFace(faceToken) {
        const formData = new form_data_1.default();
        formData.append("api_key", API_KEY);
        formData.append("api_secret", API_SECRET);
        formData.append("outer_id", FACESET_ID);
        formData.append("face_token", faceToken);
        const res = await axios_1.default.post(`${FACEPP_URL}/search`, formData, {
            headers: formData.getHeaders(),
        });
        return res.data;
    }
    static async addFace(faceToken) {
        const formData = new form_data_1.default();
        formData.append("api_key", API_KEY);
        formData.append("api_secret", API_SECRET);
        formData.append("outer_id", FACESET_ID);
        formData.append("face_tokens", faceToken);
        const res = await axios_1.default.post(`${FACEPP_URL}/faceset/addface`, formData, {
            headers: formData.getHeaders(),
        });
        return res.data;
    }
}
exports.FaceService = FaceService;
//# sourceMappingURL=face.service.js.map