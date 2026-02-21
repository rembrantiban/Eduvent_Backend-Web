import express from "express";
import { AuthCookieMiddleware } from "../../middleware/AuthMiddleware";
import {
         signupUser, 
         loginUser,
         completeProfile,
         requestResetCode,
         verifyResetCode,
         resetPassword,
         loginAdmin,
         logoutUser,
         checkUserAuth,
         getUsersSameDepartment,
         createUserByTeacher,
         getAllUsers,
         createUserByAdmin,
        } from "./user.Controller";


const router = express.Router();


router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/admin-login", loginAdmin);
router.get("/check-auth", AuthCookieMiddleware, checkUserAuth);
router.post("/logout", logoutUser);
router.post("/complete-profile", AuthCookieMiddleware, completeProfile);
router.post("/request-password-reset", requestResetCode);
router.post("/verify-password-reset", verifyResetCode);
router.post("/confirm-password-reset", resetPassword);
router.post("/create-user-by-teacher", AuthCookieMiddleware, createUserByTeacher);
router.post("/create-user-by-admin", AuthCookieMiddleware, createUserByAdmin);
router.get("/get-all-users", getAllUsers);
router.get("/get-users-same-department", AuthCookieMiddleware, getUsersSameDepartment);

export default router;