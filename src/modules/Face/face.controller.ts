import { Request, Response } from "express";
import { FaceService } from "./face.service";
import { FaceUser } from "./face.model";

export class FaceController {

  // REGISTER FACE (enrollment)
 static async register(req: Request, res: Response) {
  console.log("➡️ [REGISTER] Request received");

  try {
    const { userId, name } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "Image is required" });
    }

    if (!userId || !name) {
      return res.status(400).json({ message: "userId and name are required" });
    }

    // 1. Detect face
    const detectResult = await FaceService.detectFace(req.file.buffer);

    if (!detectResult.faces || detectResult.faces.length === 0) {
      return res.status(400).json({ message: "No face detected" });
    }

    const faceToken = detectResult.faces[0].face_token;

    // 2. Try searching face (skip if FaceSet is empty)
    let searchResult: any = null;

    try {
     searchResult = await FaceService.identifyByToken(faceToken);
    } catch (err: any) {
      const faceppError = err?.response?.data?.error_message;
      if (faceppError !== "EMPTY_FACESET") {
        throw err; // real error → stop
      }
      // else: FaceSet is empty → continue
    }

    // 3. If match found → prevent duplicate
    if (searchResult?.results && searchResult.results.length > 0) {
      const bestMatch = searchResult.results[0];

      if (bestMatch.confidence > 80) {
        const existingFaceUser = await FaceUser.findOne({
          faceToken: bestMatch.face_token,
        });

        if (existingFaceUser) {
          return res.status(409).json({
            message: "This face is already registered to another account",
          });
        }
      }
    }

    // 4. Check if THIS user already has a face
    const existingUserFace = await FaceUser.findOne({ userId });

    if (existingUserFace) {
      return res.status(409).json({
        message: "This user already has a registered face",
      });
    }

    // 5. Add face to FaceSet
    await FaceService.addFaceToSet(faceToken);

    // 6. Save in DB
    const faceUser = await FaceUser.create({
      userId,
      name,
      faceToken,
    });

    return res.status(201).json({
      message: "Face registered successfully",
      data: faceUser,
    });

  } catch (error: any) {
    console.error("🔥 REGISTER ERROR:", error?.response?.data || error.message);
    return res.status(500).json({
      message: "Registration failed",
      error: error?.response?.data || error.message,
    });
  }
}


  // IDENTIFY FACE (attendance / authentication)
static async identify(req: Request, res: Response) {
    console.log("➡️ [IDENTIFY] Request received");

    try {
      if (!req.file) {
        return res.status(400).json({ message: "Image is required" });
      }

      // 1. Detect face
      const detectResult = await FaceService.detectFace(req.file.buffer);

      if (!detectResult.faces || detectResult.faces.length === 0) {
        return res.status(404).json({ message: "No face detected" });
      }

      const faceToken = detectResult.faces[0].face_token;

      // 2. Search using token
      const searchResult = await FaceService.identifyByToken(faceToken);

      if (!searchResult.results || searchResult.results.length === 0) {
        return res.status(404).json({ message: "No matching face found" });
      }

      const bestMatch = searchResult.results[0];

      // 3. Find in DB
      const faceUser = await FaceUser.findOne({ faceToken: bestMatch.face_token });

      if (!faceUser) {
        return res.status(404).json({ message: "Face not registered" });
      }

      return res.json({
        message: "Face identified",
        user: faceUser,
        confidence: bestMatch.confidence,
      });

    } catch (error: any) {
      console.error("🔥 IDENTIFY ERROR:", error?.response?.data || error.message);

      if (error?.response?.data?.error_message === "CONCURRENCY_LIMIT_EXCEEDED") {
        return res.status(429).json({
          message: "Face service busy. Please try again in a few seconds.",
        });
      }

      return res.status(500).json({
        message: "Identification failed",
        error: error?.response?.data || error.message,
      });
    }
  }
}
