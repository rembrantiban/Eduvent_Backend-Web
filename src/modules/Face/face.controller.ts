import { Request, Response } from "express";
import { FaceService } from "./face.service";
import { FaceUser } from "./face.model";

export class FaceController {

  static async register(req: Request, res: Response) {

    try {
      const { userId, name } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: "Image required" });
      }

      if (!userId || !name) {
        return res.status(400).json({ message: "userId and name required" });
      }

      const existingUser = await FaceUser.findOne({ userId });

      if (existingUser) {
        return res.status(409).json({
          message: "User already has registered face"
        });
      }

      const detect = await FaceService.detectFace(req.file.buffer);

      if (!detect.faces || detect.faces.length === 0) {
        return res.status(400).json({
          message: "No face detected"
        });
      }

      const faceToken = detect.faces[0].face_token;

      await FaceService.addFace(faceToken);

      const faceUser = await FaceUser.create({
        userId,
        name,
        faceToken
      });

      return res.status(201).json({
        message: "Face registered successfully",
        data: faceUser
      });

    } catch (error: any) {

      console.error(error?.response?.data || error.message);

      return res.status(500).json({
        message: "Face registration failed"
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