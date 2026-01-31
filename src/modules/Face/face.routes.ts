import { Router } from "express";
import multer from "multer";
import { FaceController } from "./face.controller";

const upload = multer();
const router = Router();

router.post("/register", upload.single("image"), FaceController.register);
router.post("/identify", upload.single("image"), FaceController.identify);

export default router;
