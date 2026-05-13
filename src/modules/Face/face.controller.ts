import { Request, Response } from "express";
import { FaceService } from "./face.service";
import { FaceUser } from "./face.model";
import { User } from "../User/user.Model"

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));


export class FaceController {

  static async register(req: Request, res: Response) {

  try {
    const { userId, name } = req.body;

    const user = await User.findById(userId)

    if(!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if(user.isFaceRegistered) {
      return res.status(409).json({ message: "User already has registered face" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "Image required" });
    }

    if (!userId || !name) {
      return res.status(400).json({ message: "userId and name required" });
    }

    // 1️⃣ Check if user already registered
    const existingUser = await FaceUser.findOne({ userId });

    if (existingUser) {
      return res.status(409).json({
        message: "User already has registered face"
      });
    }

    // 2️⃣ Detect face
    const detect = await FaceService.detectFace(req.file.buffer);

    await delay(800)

    if (!detect.faces || detect.faces.length === 0) {
      return res.status(400).json({
        message: "No face detected"
      });
    }

    const faceToken = detect.faces[0].face_token;

    // 3️⃣ Check if face already exists in FaceSet
    const search = await FaceService.searchFace(faceToken);

    if (search.results && search.results.length > 0) {

      const best = search.results[0];

      if (best.confidence > 90) {

        const existingFace = await FaceUser.findOne({
          faceToken: best.face_token
        });

        if (existingFace) {
          return res.status(409).json({
            message: "This face is already registered to another user"
          });
        }
      }
    }

    await delay(800)

    // 4️⃣ Add face to FaceSet
    await FaceService.addFace(faceToken);

    // 5️⃣ Save to database
    const faceUser = await FaceUser.create({
      userId,
      name,
    });

    await User.findByIdAndUpdate(userId, {
      isFaceRegistered: true
    });


    return res.status(201).json({
      message: "Face registered successfully",
      data: faceUser,
      isFaceRegister: true
    });

  } catch (error: any) {

    console.error(error?.response?.data || error.message);

    return res.status(500).json({
      message: "Face registration failed please try again"
    });

  }
}
  static async identify(req: Request, res: Response) {

    try {

      if (!req.file) {
        return res.status(400).json({ message: "Image required" });
      }

      const detect = await FaceService.detectFace(req.file.buffer);

      if (!detect.faces || detect.faces.length === 0) {
        return res.status(404).json({
          message: "No face detected"
        });
      }

      const faceToken = detect.faces[0].face_token;

      const search = await FaceService.searchFace(faceToken);

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

      const faceUser = await FaceUser.findOne({
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

    } catch (error: any) {

      console.error(error?.response?.data || error.message);

      return res.status(500).json({
        message: "Face identification failed"
      });

    }
  }
}