import express from "express";
import { requireAuth } from "../../common/middleware/authmiddleware";
import { MobileAuth } from "../../middleware/AuthCookieMiddleware"
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
         getTotalUsers,
         deleteUserAccount,
         savePushToken,
         DeactivateUserAccount,
         updateUserFullname,
         updatePassword,
         updateUserProfileForStudent,
         updateUser,
         updateUserRole,
         resendResetCode,
         changeStudentPassword,
         getCurrentUser,
        } from "./user.Controller";
import uploadImage from "../../middleware/multer";

const router = express.Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);
router.put("/update-user/:id", requireAuth, updateUser);
router.post("/admin-login", loginAdmin);
router.get("/check-auth", requireAuth, checkUserAuth);
router.post("/logout", logoutUser);
router.put("/complete-profile", MobileAuth, completeProfile);
router.post("/request-password-reset", requestResetCode);
router.post("/verify-password-reset", verifyResetCode);
router.post("/confirm-password-reset", resetPassword);
router.post("/resend-reset-code", resendResetCode);
router.post("/create-user-by-teacher", requireAuth, createUserByTeacher);
router.post("/create-user-by-admin", requireAuth, createUserByAdmin);
router.get("/get-all-users", requireAuth, getAllUsers);
router.get("/get-users-same-department", requireAuth, getUsersSameDepartment);
router.get("/get-total-users", getTotalUsers);
router.delete("/delete-user/:id", requireAuth, deleteUserAccount);
router.post("/save-push-token", MobileAuth, savePushToken);
router.put("/update-fullname", requireAuth,uploadImage.single("avatar"), updateUserFullname);
router.put("/update-password", requireAuth, updatePassword);
router.put("/update-profile-for-student", requireAuth, uploadImage.single("avatar"), updateUserProfileForStudent);
router.put("/update-user-role/:id", requireAuth, updateUserRole);
router.put("/deactivate-user/:id", requireAuth, DeactivateUserAccount);
router.put("/change-password", MobileAuth, changeStudentPassword);
router.get(  "/current-user", requireAuth ,getCurrentUser);
export default router;  