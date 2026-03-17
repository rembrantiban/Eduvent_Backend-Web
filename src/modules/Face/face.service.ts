import axios from "axios";
import FormData from "form-data";

const FACEPP_URL = "https://api-us.faceplusplus.com/facepp/v3";
const API_KEY = process.env.FACEPP_KEY!;
const API_SECRET = process.env.FACEPP_SECRET!;
const FACESET_ID = "students";

export class FaceService {

  static async detectFace(imageBuffer: Buffer) {
    const formData = new FormData();
    formData.append("api_key", API_KEY);
    formData.append("api_secret", API_SECRET);
    formData.append("image_file", imageBuffer, "face.jpg");

    const res = await axios.post(`${FACEPP_URL}/detect`, formData, {
      headers: formData.getHeaders(),
    });

    return res.data;
  }

  static async searchFace(faceToken: string) {
    const formData = new FormData();

    formData.append("api_key", API_KEY);
    formData.append("api_secret", API_SECRET);
    formData.append("outer_id", FACESET_ID);
    formData.append("face_token", faceToken);

    const res = await axios.post(`${FACEPP_URL}/search`, formData, {
      headers: formData.getHeaders(),
    });

    return res.data;
  }

  static async addFace(faceToken: string) {
    const formData = new FormData();

    formData.append("api_key", API_KEY);
    formData.append("api_secret", API_SECRET);
    formData.append("outer_id", FACESET_ID);
    formData.append("face_tokens", faceToken);

    const res = await axios.post(`${FACEPP_URL}/faceset/addface`, formData, {
      headers: formData.getHeaders(),
    });

    return res.data;
  }
}