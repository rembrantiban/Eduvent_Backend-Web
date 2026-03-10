import { Router } from "express";
import multer from "multer";
import { FaceController } from "./face.controller";

const router = Router();

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post("/register", upload.single("image"), FaceController.register);
router.post("/identify", upload.single("image"), FaceController.identify);

export default router;