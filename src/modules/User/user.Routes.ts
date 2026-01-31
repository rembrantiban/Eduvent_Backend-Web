import express from "express";
import {
         signupUser, 
         loginUser,
         completeProfile,
         requestResetCode,
         verifyResetCode,
         resetPassword
        } from "./user.Controller";

const router = express.Router();


router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/complete-profile", completeProfile);
router.post("/request-password-reset", requestResetCode);
router.post("/verify-password-reset", verifyResetCode);
router.post("/confirm-password-reset", resetPassword);

export default router;