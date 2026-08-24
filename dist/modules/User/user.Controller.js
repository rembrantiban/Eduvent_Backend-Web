"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeStudentPassword = exports.updateUserRole = exports.updatePassword = exports.updateUserFullname = exports.savePushToken = exports.deleteUserAccount = exports.getTotalUsers = exports.DeactivateUserAccount = exports.getAllUsers = exports.getUsersSameCourse = exports.checkUserAuth = exports.logoutUser = exports.resendResetCode = exports.resetPassword = exports.verifyResetCode = exports.requestResetCode = exports.updateUserProfileForStudent = exports.completeProfile = exports.loginUser = exports.getCurrentUser = exports.loginAdmin = exports.updateUser = exports.createUserByAdmin = exports.createUserByTeacher = exports.signupUser = void 0;
const user_Model_1 = require("./user.Model");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const resend_1 = require("../../common/lib/resend");
const cloudinary_1 = __importDefault(require("../../config/cloudinary"));
const roles_1 = __importDefault(require("../../common/utils/roles"));
const EmailTemplate_services_1 = require("../../services/EmailTemplate.services");
const department_Model_1 = require("../Department/department.Model");
const SALT_ROUNDS = 12;
const signupUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, role, studentId, yearLevel, major, course, section } = req.body;
        if (!firstName || !lastName || !email || !password || !role) {
            return res.status(400).json({ message: "Please provide all required fields." });
        }
        if (role === "student") {
            if (!studentId || !firstName || !lastName || !password || !email) {
                return res.status(400).json({ message: "Student ID, first name, last name, and password are required for students." });
            }
        }
        // Check if email exists
        const existingUser = await user_Model_1.User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists." });
        }
        // Check if studentId exists (only for students)
        if (role === "student") {
            const existingStudent = await user_Model_1.User.findOne({ studentId });
            if (existingStudent) {
                return res.status(400).json({ message: "Student ID already exists." });
            }
        }
        // Hash password securely
        const hashedPassword = await bcrypt_1.default.hash(password, SALT_ROUNDS);
        // Create new user object
        const newUser = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email,
            password: hashedPassword,
            role,
        };
        if (role === "student" || role === "CSSG_officer") {
            newUser.studentId = studentId;
            newUser.yearLevel = yearLevel;
            newUser.major = major;
            newUser.course = course;
            newUser.section = section;
        }
        const createdUser = await user_Model_1.User.create(newUser);
        const token = jsonwebtoken_1.default.sign({ id: createdUser._id, role: createdUser.role }, process.env.JWT_SECRET || "defaultsecret", { expiresIn: "7d" });
        return res.status(201).json({
            message: "Register successfully",
            user: {
                id: createdUser._id,
                firstName: createdUser.firstName,
                lastName: createdUser.lastName,
                email: createdUser.email,
                role: createdUser.role,
                studentId: createdUser.studentId,
                yearLevel: createdUser.yearLevel,
                course: createdUser.course,
                major: createdUser.major,
                section: createdUser.section,
            },
            token,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.signupUser = signupUser;
const createUserByTeacher = async (req, res) => {
    try {
        if (!req.user || req.user.role !== "CSSG_Adviser") {
            return res.status(403).json({
                message: "Only teachers can create users.",
            });
        }
        const { firstName, lastName, email, password, role, studentId, major, yearLevel, section, } = req.body;
        if (!["student", "CSSG_officer", "Saso"].includes(role)) {
            return res.status(403).json({
                message: "Teachers can only create students, CSSG officers, or Saso.",
            });
        }
        if (!firstName || !lastName || !email || !role || !password) {
            return res.status(400).json({
                message: "Missing required fields.",
            });
        }
        const existingUser = await user_Model_1.User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: "Email already exists.",
            });
        }
        if (role === "student" && studentId) {
            const existingStudent = await user_Model_1.User.findOne({ studentId });
            if (existingStudent) {
                return res.status(400).json({
                    message: "Student ID already exists.",
                });
            }
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email format.",
            });
        }
        if (!req.user || req.user.role !== "CSSG_Adviser") {
            return res.status(403).json({ message: "Forbidden" });
        }
        const course = req.user.course;
        // Default password
        const hashedPassword = await bcrypt_1.default.hash(password, 12);
        const newUser = await user_Model_1.User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role,
            course,
            ...(role === "student" && {
                studentId,
                yearLevel,
                section,
                major,
            }),
        });
        return res.status(201).json({
            message: "User created successfully.",
            user: {
                id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                role: newUser.role,
                course: newUser.course,
                major: newUser.major,
            },
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({
            message: "Server error",
        });
    }
};
exports.createUserByTeacher = createUserByTeacher;
const createUserByAdmin = async (req, res) => {
    try {
        //  Only admin allowed
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                message: "Only admins can create users.",
            });
        }
        const { firstName, lastName, email, password, role, course, studentId, yearLevel, section, major, } = req.body;
        // ✅ Allowed roles
        if (!["CSSG_Adviser", "student", "CSSG_officer", "Saso"].includes(role)) {
            return res.status(403).json({
                message: "Invalid role. Admin can only create CSSG Adviser  , student, CSSG officer, or Saso.",
            });
        }
        // ✅ Required fields
        if (!firstName || !lastName || !email || !password || !role || !course) {
            return res.status(400).json({
                message: "Missing required fields.",
            });
        }
        // ✅ Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: "Invalid email format.",
            });
        }
        //  Check email uniqueness
        const existingUser = await user_Model_1.User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: "Email already exists.",
            });
        }
        // Student-specific validation
        if (role === "student") {
            if (!studentId || !yearLevel || !section) {
                return res.status(400).json({
                    message: "Missing student information.",
                });
            }
            const existingStudent = await user_Model_1.User.findOne({ studentId });
            if (existingStudent) {
                return res.status(400).json({
                    message: "Student ID already exists.",
                });
            }
        }
        //  Hash password
        const hashedPassword = await bcrypt_1.default.hash(password, 12);
        const newUser = await user_Model_1.User.create({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role,
            course,
            ...(role === "student" || role === "CSSG_officer") && {
                major,
                studentId,
                yearLevel,
                section,
            },
        });
        return res.status(201).json({
            message: "User created successfully.",
            user: {
                id: newUser._id,
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                role: newUser.role,
                course: newUser.course,
                major: newUser.major,
            },
        });
    }
    catch (err) {
        console.error("Create user by admin error:", err);
        return res.status(500).json({
            message: "Server error",
        });
    }
};
exports.createUserByAdmin = createUserByAdmin;
const updateUser = async (req, res) => {
    try {
        const currentUser = req.user;
        if (!currentUser || !["admin", "CSSG_Adviser", "Saso"].includes(currentUser.role)) {
            return res.status(403).json({
                message: "You are not allowed to update users.",
            });
        }
        const { id } = req.params;
        const { firstName, lastName, email, role, course, major, studentId, yearLevel, section, password, } = req.body;
        const userToUpdate = await user_Model_1.User.findById(id);
        if (!userToUpdate) {
            return res.status(404).json({
                message: "User not found.",
            });
        }
        const isStudentRole = ["student", "CSSG_officer"].includes(role);
        if (currentUser.role === "CSSG_Adviser") {
            if (!["student", "CSSG_officer", "Saso"].includes(userToUpdate.role)) {
                return res.status(403).json({
                    message: "CSSG_Adviser cannot update this user.",
                });
            }
            if (userToUpdate.course !== currentUser.course) {
                return res.status(403).json({
                    message: "You can only update users in your course.",
                });
            }
        }
        if (currentUser.role === "Saso") {
            if (userToUpdate.role === "admin") {
                return res.status(403).json({
                    message: "Saso cannot update admin.",
                });
            }
        }
        if (email) {
            const emailExists = await user_Model_1.User.findOne({
                email,
                _id: { $ne: id },
            });
            if (emailExists) {
                return res.status(400).json({
                    message: "Email already in use.",
                });
            }
        }
        if (isStudentRole) {
            if (!studentId || !yearLevel || !section) {
                return res.status(400).json({
                    message: "Missing student fields.",
                });
            }
            const existingStudent = await user_Model_1.User.findOne({
                studentId,
                _id: { $ne: id },
            });
            if (existingStudent) {
                return res.status(400).json({
                    message: "Student ID already exists.",
                });
            }
        }
        const updateData = {
            firstName: firstName?.trim(),
            lastName: lastName?.trim(),
            email,
            role,
            course,
        };
        if (isStudentRole) {
            updateData.studentId = studentId;
            updateData.yearLevel = yearLevel;
            updateData.section = section;
            updateData.major = major;
        }
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    message: "Password must be at least 6 characters",
                });
            }
            if (currentUser.role !== "admin" && currentUser._id.toString() !== id) {
                return res.status(403).json({
                    message: "You cannot change this password",
                });
            }
            const salt = await bcrypt_1.default.genSalt(10);
            updateData.password = await bcrypt_1.default.hash(password, salt);
        }
        const updatedUser = await user_Model_1.User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select("-password");
        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Update user error:", error);
        return res.status(500).json({
            message: error.message,
        });
    }
};
exports.updateUser = updateUser;
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Please provide email and password." });
        }
        const user = await user_Model_1.User.findOne({
            email: email,
            role: { $in: ["admin", "CSSG_Adviser", "Saso", "CSSG_officer"] },
        }).select("+password");
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        if (user.isActive === false) {
            return res.status(401).json({ message: "Your account is deactivated. Please contact admin." });
        }
        const isValidPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        const token = jsonwebtoken_1.default.sign({
            id: user._id,
            role: user.role,
            email: user.email,
        }, process.env.JWT_SECRET || "defaultsecret", { expiresIn: "7d" });
        const isProduction = process.env.NODE_ENV === "production";
        // ✅ SET COOKIE
        res.cookie("user_token", token, {
            httpOnly: true,
            secure: isProduction, // ✅ only true in production
            sameSite: isProduction ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: "/"
        });
        return res.status(200).json({
            message: "Login successful.",
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                course: user.course,
                avatar: user.avatar,
                isFaceRegistered: user.isFaceRegistered
            },
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.loginAdmin = loginAdmin;
const getCurrentUser = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }
        const user = await user_Model_1.User.findById(req.user._id)
            .select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }
        return res.status(200).json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                avatar: user.avatar,
                studentId: user.studentId,
                course: user.course,
                major: user.major,
                yearLevel: user.yearLevel,
                section: user.section,
                isFaceRegistered: user.isFaceRegistered,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    }
    catch (error) {
        console.error("Get current user error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error.",
        });
    }
};
exports.getCurrentUser = getCurrentUser;
const loginUser = async (req, res) => {
    try {
        const { identifier, password } = req.body;
        if (!identifier || !password) {
            return res.status(400).json({
                message: "Please provide identifier and password.",
            });
        }
        const normalizedIdentifier = identifier.trim().toLowerCase();
        const user = await user_Model_1.User.findOne({
            $or: [
                { email: normalizedIdentifier },
                { studentId: normalizedIdentifier },
            ],
        }).select("+password");
        if (user && user.isActive === false) {
            return res.status(401).json({
                message: "Your account is deactivated. Please contact admin.",
            });
        }
        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials.",
            });
        }
        const isValidPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                message: "Invalid credentials.",
            });
        }
        let isProfileComplete = true;
        if (user.role === "student" || user.role === "CSSG_officer") {
            const selectedCourse = await department_Model_1.Course.findOne({
                name: user.course,
            });
            const hasMajors = (selectedCourse?.majors?.length ?? 0) > 0;
            isProfileComplete = Boolean(user.yearLevel &&
                user.course &&
                user.section &&
                (!hasMajors || user.major));
        }
        const token = jsonwebtoken_1.default.sign({
            id: user._id,
            role: user.role,
            email: user.email,
            studentId: user.studentId,
            course: user.course,
            section: user.section,
            yearLevel: user.yearLevel,
            major: user.major,
            isFaceRegistered: user.isFaceRegistered,
            avatar: user.avatar
        }, process.env.JWT_SECRET || "defaultsecret", { expiresIn: "7d" });
        return res.status(200).json({
            message: "Login successful.",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                studentId: user.studentId,
                yearLevel: user.yearLevel,
                course: user.course,
                major: user.major,
                section: user.section,
                profileCompleted: isProfileComplete,
                avatar: user.avatar,
                isFaceRegistered: user.isFaceRegistered
            },
            token,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};
exports.loginUser = loginUser;
const completeProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }
        const { yearLevel, course, section, major } = req.body;
        const userId = req.user._id;
        if (!yearLevel || !course || !section) {
            return res.status(400).json({
                message: "Year level, course, and section are required.",
            });
        }
        const selectedCourse = await department_Model_1.Course.findOne({
            name: course.trim(),
        });
        if (!selectedCourse) {
            return res.status(404).json({
                message: "Course not found.",
            });
        }
        const hasMajors = (selectedCourse.majors?.length ?? 0) > 0;
        if (hasMajors && !major?.trim()) {
            return res.status(400).json({
                message: "Please select a major for this course.",
            });
        }
        const updatedUser = await user_Model_1.User.findByIdAndUpdate(userId, {
            yearLevel: yearLevel.trim(),
            course: course.trim(),
            section: section.trim(),
            major: hasMajors ? major.trim() : "",
        }, {
            new: true,
        });
        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found.",
            });
        }
        return res.status(200).json({
            message: "Profile completed successfully",
            user: updatedUser,
        });
    }
    catch (err) {
        console.error("Complete profile error:", err);
        return res.status(500).json({
            message: "Internal server error",
        });
    }
};
exports.completeProfile = completeProfile;
const updateUserProfileForStudent = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { firstName, lastName, yearLevel, course, section, major } = req.body;
        if (!firstName || !lastName || !yearLevel || !course || !section) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }
        if (firstName.length < 2 || lastName.length < 2) {
            return res.status(400).json({
                message: "Names must be at least 2 characters long",
            });
        }
        let avatarUrl;
        if (req.file) {
            const uploadResult = await new Promise((resolve, reject) => {
                cloudinary_1.default.uploader
                    .upload_stream({
                    folder: "users",
                    resource_type: "image",
                }, (error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve(result);
                })
                    .end(req.file.buffer);
            });
            avatarUrl = uploadResult.secure_url;
        }
        const updateData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            yearLevel: yearLevel.trim(),
            course: course.trim(),
            major: major.trim(),
            section: section.trim()
        };
        // ✅ only add avatar if uploaded
        if (avatarUrl) {
            updateData.avatar = avatarUrl;
        }
        const updatedUser = await user_Model_1.User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select("-password");
        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({
            message: "Failed to update profile",
        });
    }
};
exports.updateUserProfileForStudent = updateUserProfileForStudent;
const requestResetCode = async (req, res) => {
    try {
        const { email } = req.body;
        console.log("EMAIL:", email);
        const user = await user_Model_1.User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }
        const code = crypto_1.default
            .randomInt(100000, 999999)
            .toString();
        user.resetPasswordCode = crypto_1.default
            .createHash("sha256")
            .update(code)
            .digest("hex");
        user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
        user.resetPasswordVerified = false;
        await user.save();
        const resendResponse = await resend_1.resend.emails.send({
            from: "EduVent <no-reply@eduvent.site>",
            to: email,
            subject: "Password Reset Code",
            html: (0, EmailTemplate_services_1.emailTemplate)(Number(code), user.firstName),
        });
        console.log("RESEND RESPONSE:", resendResponse);
        return res.json({
            success: true,
            message: "Reset code sent to email",
        });
    }
    catch (err) {
        console.log("RESEND ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: err.message,
        });
    }
};
exports.requestResetCode = requestResetCode;
const verifyResetCode = async (req, res) => {
    try {
        const { email, code } = req.body;
        const hashedCode = crypto_1.default
            .createHash("sha256")
            .update(code)
            .digest("hex");
        const user = await user_Model_1.User.findOne({
            email,
            resetPasswordCode: hashedCode,
            resetPasswordExpires: { $gt: new Date() },
        });
        if (!user) {
            return res.status(400).json({ message: "Invalid or expired code" });
        }
        user.resetPasswordVerified = true;
        await user.save();
        res.json({ message: "Code verified successfully" });
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
};
exports.verifyResetCode = verifyResetCode;
const resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const user = await user_Model_1.User.findOne({
            email,
            resetPasswordVerified: true,
            resetPasswordExpires: { $gt: new Date() },
        });
        if (!user) {
            return res.status(400).json({ message: "Reset not verified" });
        }
        user.password = await bcrypt_1.default.hash(newPassword, 12);
        // Cleanup
        // user.resetPasswordCode = undefined;
        //  user.resetPasswordExpires = undefined;
        // user.resetPasswordVerified = undefined;
        await user.save();
        res.json({ message: "Password reset successful" });
    }
    catch {
        res.status(500).json({ message: "Server error" });
    }
};
exports.resetPassword = resetPassword;
const resendResetCode = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required",
            });
        }
        const user = await user_Model_1.User.findOne({
            email,
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        // Generate new code
        const code = crypto_1.default
            .randomInt(100000, 999999)
            .toString();
        // Hash code
        user.resetPasswordCode =
            crypto_1.default
                .createHash("sha256")
                .update(code)
                .digest("hex");
        // Expiration
        user.resetPasswordExpires =
            new Date(Date.now() +
                10 * 60 * 1000);
        // Reset verification state
        user.resetPasswordVerified =
            false;
        await user.save();
        await resend_1.resend.emails.send({
            from: "EduVent <no-reply@eduvent.site>",
            to: email,
            subject: "Your New Reset Code",
            html: (0, EmailTemplate_services_1.emailTemplate)(Number(code), user.firstName),
        });
        return res.status(200).json({
            success: true,
            message: "New reset code sent",
        });
    }
    catch (err) {
        console.log("RESEND RESET CODE ERROR:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};
exports.resendResetCode = resendResetCode;
const logoutUser = async (req, res) => {
    try {
        res.clearCookie("user_token", {
            httpOnly: true,
            secure: false, // true in production (HTTPS)
            sameSite: "lax", // use "none" + secure:true if cross-site HTTPS
        });
        return res.status(200).json({ message: "Logout successful." });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.logoutUser = logoutUser;
const checkUserAuth = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        // 🔥 Optional optimization: skip DB call if not needed
        return res.status(200).json({
            user: {
                id: req.user._id,
                firstName: req.user.firstName,
                lastName: req.user.lastName,
                email: req.user.email,
                role: req.user.role,
                studentId: req.user.studentId,
                yearLevel: req.user.yearLevel,
                section: req.user.section,
                course: req.user.course,
                avatar: req.user.avatar,
            },
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
exports.checkUserAuth = checkUserAuth;
const getUsersSameCourse = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!req.user.course) {
            return res
                .status(400)
                .json({ message: "User has no course assigned" });
        }
        const users = await user_Model_1.User.find({
            course: req.user.course,
            role: { $ne: "CSSG_Adviser" },
        }).select("-password");
        return res.json(users.map((user) => ({
            id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            section: user.section,
            course: user.course,
            studentId: user.studentId,
            yearLevel: user.yearLevel,
            dateAdded: user.createdAt
                ? new Date(user.createdAt).toLocaleDateString()
                : "NA",
            lastActive: user.updatedAt
                ? new Date(user.updatedAt).toLocaleDateString()
                : "NA",
        })));
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.getUsersSameCourse = getUsersSameCourse;
const getAllUsers = async (req, res) => {
    try {
        const currentUserRole = req.user?.role;
        let roleFilter = {};
        if (currentUserRole === "admin") {
            roleFilter = { role: { $in: ["student", "CSSG_officer", "CSSG_Adviser", "Saso"] } };
        }
        else if (currentUserRole === "CSSG_Adviser") {
            roleFilter = { role: { $in: ["student", "CSSG_officer"] } };
        }
        else if (currentUserRole === "CSSG_officer") {
            roleFilter = { role: { $in: ["student"] } };
        }
        else if (currentUserRole === "Saso") {
            roleFilter = { role: { $in: ["student", "CSSG_officer", "CSSG_Adviser"] } };
        }
        else {
            return res.status(403).json({ message: "Unauthorized" });
        }
        const users = await user_Model_1.User.find(roleFilter).select("-password");
        return res.json(users.map((user) => ({
            id: user._id.toString(),
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            section: user.section,
            course: user.course,
            major: user.major,
            studentId: user.studentId,
            yearLevel: user.yearLevel,
            avatar: user.avatar,
            isFaceRegistered: user.isFaceRegistered,
            isActive: user.isActive,
            dateAdded: user.createdAt
                ? new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                }).format(new Date(user.createdAt))
                : "NA",
            lastActive: user.updatedAt
                ? new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                }).format(new Date(user.updatedAt))
                : "NA",
        })));
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.getAllUsers = getAllUsers;
const DeactivateUserAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await user_Model_1.User.findById(id);
        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }
        user.isActive = !user.isActive;
        await user.save();
        return res.json({
            success: true,
            message: user.isActive
                ? "User account activated successfully"
                : "User account deactivated successfully",
            user
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error"
        });
    }
};
exports.DeactivateUserAccount = DeactivateUserAccount;
const getTotalUsers = async (req, res) => {
    try {
        const totalUsers = await user_Model_1.User.countDocuments({ role: { $ne: "admin" } });
        return res.json({ totalUsers });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
};
exports.getTotalUsers = getTotalUsers;
const deleteUserAccount = async (req, res) => {
    try {
        const { id } = req.params;
        const deleteUser = await user_Model_1.User.findByIdAndDelete(id);
        if (!deleteUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(200).json({ success: true, deleteUser: deleteUser });
    }
    catch (error) {
        console.error("Internal Server Error", error);
        return res.status(500).json({ success: false, message: "Something went wrong" });
    }
};
exports.deleteUserAccount = deleteUserAccount;
const savePushToken = async (req, res) => {
    try {
        const { pushToken } = req.body;
        if (!pushToken) {
            return res.status(400).json({ message: "Push token required" });
        }
        await user_Model_1.User.findByIdAndUpdate(req.user?._id, {
            pushToken,
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to save token" });
    }
};
exports.savePushToken = savePushToken;
const updateUserFullname = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { firstName, lastName } = req.body;
        if (!firstName || !lastName) {
            return res.status(400).json({
                message: "First name and last name are required",
            });
        }
        if (firstName.length < 2 || lastName.length < 2) {
            return res.status(400).json({
                message: "Names must be at least 2 characters long",
            });
        }
        let avatarUrl;
        if (req.file) {
            const uploadResult = await new Promise((resolve, reject) => {
                cloudinary_1.default.uploader
                    .upload_stream({
                    folder: "users",
                    resource_type: "image",
                }, (error, result) => {
                    if (error)
                        reject(error);
                    else
                        resolve(result);
                })
                    .end(req.file.buffer);
            });
            avatarUrl = uploadResult.secure_url;
        }
        const updateData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
        };
        // ✅ only add avatar if uploaded
        if (avatarUrl) {
            updateData.avatar = avatarUrl;
        }
        const updatedUser = await user_Model_1.User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true }).select("-password");
        if (!updatedUser) {
            return res.status(404).json({
                message: "User not found",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser,
        });
    }
    catch (error) {
        console.error("Update profile error:", error);
        return res.status(500).json({
            message: "Failed to update profile",
        });
    }
};
exports.updateUserFullname = updateUserFullname;
const updatePassword = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { newPassword, confirmPassword } = req.body;
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }
        if (!newPassword || !confirmPassword) {
            return res.status(400).json({ message: "All password fields are required" });
        }
        const hashpassword = await bcrypt_1.default.hash(newPassword, 10);
        const user = await user_Model_1.User.findByIdAndUpdate(userId, { password: hashpassword }, { new: true });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({ success: true, message: "Password updated successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to update password" });
    }
};
exports.updatePassword = updatePassword;
const updateUserRole = async (req, res) => {
    try {
        const currentUser = req.user;
        const userId = req.params.id;
        const { role } = req.body;
        const VALID_ROLES = ["admin", "Saso", "CSSG_Adviser", "CSSG_officer", "student"];
        // ✅ Validate role
        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({ message: "Invalid role" });
        }
        const userToUpdate = await user_Model_1.User.findById(userId);
        if (!userToUpdate) {
            return res.status(404).json({ message: "User not found" });
        }
        // 🔐 Permission check
        if (!(0, roles_1.default)(currentUser, role)) {
            return res.status(403).json({
                message: "You cannot assign this role",
            });
        }
        // 🔐 Optional: prevent changing higher roles
        if (userToUpdate.role === "admin" && currentUser.role !== "admin") {
            return res.status(403).json({
                message: "Cannot modify admin",
            });
        }
        userToUpdate.role = role;
        await userToUpdate.save();
        res.json({
            message: "Role updated successfully",
            user: userToUpdate,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateUserRole = updateUserRole;
const changeStudentPassword = async (req, res) => {
    try {
        const userId = req.user._id;
        const { currentPassword, newPassword, confirmPassword, } = req.body;
        // VALIDATE
        if (!currentPassword ||
            !newPassword ||
            !confirmPassword) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }
        // PASSWORD MATCH
        if (newPassword !==
            confirmPassword) {
            return res.status(400).json({
                message: "Passwords do not match",
            });
        }
        const user = await user_Model_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }
        const isMatch = await bcrypt_1.default.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({
                message: "Current password is incorrect",
            });
        }
        const hashedPassword = await bcrypt_1.default.hash(newPassword, 12);
        user.password =
            hashedPassword;
        await user.save();
        res.status(200).json({
            success: true,
            message: "Password updated successfully",
        });
    }
    catch (error) {
        console.log("CHANGE PASSWORD ERROR:", error);
        res.status(500).json({
            message: "Server error",
        });
    }
};
exports.changeStudentPassword = changeStudentPassword;
//# sourceMappingURL=user.Controller.js.map