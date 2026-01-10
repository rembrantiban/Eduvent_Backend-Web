import express from "express";
import {
         signupUser, 
         loginUser,
         completeProfile,
        } from "./user.Controller";

const router = express.Router();


router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/complete-profile", completeProfile);

export default router;