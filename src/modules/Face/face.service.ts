import axios from "axios";
import FormData from "form-data";

const FACEPP_URL = "https://api-us.faceplusplus.com/facepp/v3";
const API_KEY = process.env.FACEPP_KEY!;
const API_SECRET = process.env.FACEPP_SECRET!;
const FACESET_ID = "students";

export class FaceService {

  // 1. Detect face from image
  static async detectFace(imageBuffer: Buffer) {
    const formData = new FormData();
    formData.append("api_key", API_KEY);
    formData.append("api_secret", API_SECRET);
    formData.append("image_file", imageBuffer, "face.jpg");

    const response = await axios.post(`${FACEPP_URL}/detect`, formData, {
      headers: formData.getHeaders(),
    });

    return response.data;
  }

  // 2. Search using FACE TOKEN (NOT image again)
  static async identifyByToken(faceToken: string) {
    const formData = new FormData();
    formData.append("api_key", API_KEY);
    formData.append("api_secret", API_SECRET);
    formData.append("outer_id", FACESET_ID);
    formData.append("face_token", faceToken);

    const response = await axios.post(`${FACEPP_URL}/search`, formData, {
      headers: formData.getHeaders(),
    });

    return response.data;
  }

  // 3. Add face to FaceSet
  static async addFaceToSet(faceToken: string) {
    const formData = new FormData();
    formData.append("api_key", API_KEY);
    formData.append("api_secret", API_SECRET);
    formData.append("outer_id", FACESET_ID);
    formData.append("face_tokens", faceToken);

    const response = await axios.post(
      `${FACEPP_URL}/faceset/addface`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    return response.data;
  }
}
