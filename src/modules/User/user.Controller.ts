import { Request, Response } from "express";
import { User, IUser, NOT_DELETED } from "./user.Model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import crypto from "crypto";
import { resend } from "../../common/lib/resend";
import cloudinary from "../../config/cloudinary"
import canAssignRole from "../../common/utils/roles"
import { emailTemplate } from "../../services/EmailTemplate.services";
import { Course } from "../Department/department.Model"
import { FaceUser } from "../Face/face.model"

const SALT_ROUNDS = 12;

export const signupUser = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, role, studentId, yearLevel, major, course, section, gender } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    if (role === "student") {
      if (!studentId || !firstName || !lastName || !password || !email) {
        return res.status(400).json({ message: "Student ID, first name, last name, and password are required for students." });
      }
      if (!gender || !["Male", "Female"].includes(gender)) {
        return res.status(400).json({ message: "Gender is required for students." });
      }
    }
    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists." });
    }

    // Check if studentId exists (only for students)
    if (role === "student") {
      const existingStudent = await User.findOne({ studentId });
      if (existingStudent) {
        return res.status(400).json({ message: "Student ID already exists." });
      }
    }

    // Hash password securely
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create new user object
    const newUser: Partial<IUser> = {
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
      newUser.gender = gender;
    }

    const createdUser = await User.create(newUser);

    const token = jwt.sign(
      { id: createdUser._id, role: createdUser.role },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: "7d" }
    );

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
        gender: createdUser.gender,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Mobile-only registration. Unlike signupUser (shared with the web client,
// which collects gender up front), the mobile app collects yearLevel/course/
// section/gender later via completeProfile ("My Info"), so gender must NOT
// be required here.
export const registerMobileUser = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, studentId } = req.body;

    if (!firstName || !lastName || !email || !password || !studentId) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists." });
    }

    const existingStudent = await User.findOne({ studentId });
    if (existingStudent) {
      return res.status(400).json({ message: "Student ID already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const createdUser = await User.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      password: hashedPassword,
      role: "student",
      studentId,
    });

    const token = jwt.sign(
      { id: createdUser._id, role: createdUser.role },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      message: "Register successfully",
      user: {
        id: createdUser._id,
        firstName: createdUser.firstName,
        lastName: createdUser.lastName,
        email: createdUser.email,
        role: createdUser.role,
        studentId: createdUser.studentId,
      },
      token,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const createUserByTeacher = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user || req.user.role !== "CSSG_Adviser") {
      return res.status(403).json({
        message: "Only teachers can create users.",
      });
    }


    const {
      firstName,
      lastName,
      email,
      password,
      role,
      studentId,
      major,
      yearLevel,
      section,
      gender,
    } = req.body;

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

    if (role === "student" && (!gender || !["Male", "Female"].includes(gender))) {
      return res.status(400).json({
        message: "Gender is required for students.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists.",
      });
    }

    if (role === "student" && studentId) {
      const existingStudent = await User.findOne({ studentId });
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
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
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
        gender,
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

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const createUserByAdmin = async (
  req: Request,
  res: Response
) => {
  try {
    //  Only admin allowed
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        message: "Only admins can create users.",
      });
    }

    const {
      firstName,
      lastName,
      email,
      password,
      role,
      course,
      studentId,
      yearLevel,
      section,
      major,
      gender,
    } = req.body;

    // ✅ Allowed roles
    if (!["CSSG_Adviser", "student", "CSSG_officer", "Saso"].includes(role)) {
      return res.status(403).json({
        message: "Invalid role. Admin can only create CSSG Adviser  , student, CSSG officer, or Saso.",
      });
    }

    // ✅ Required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({
        message: "Missing required fields.",
      });
    }

    // Course only applies to student-type accounts (Saso / CSSG Adviser are campus-wide)
    if ((role === "student" || role === "CSSG_officer") && !course) {
      return res.status(400).json({
        message: "Course is required for students and CSSG officers.",
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
    const existingUser = await User.findOne({ email });
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

      if (!gender || !["Male", "Female"].includes(gender)) {
        return res.status(400).json({
          message: "Gender is required for students.",
        });
      }

      const existingStudent = await User.findOne({ studentId });
      if (existingStudent) {
        return res.status(400).json({
          message: "Student ID already exists.",
        });
      }
    }

    //  Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
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
        gender,
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

  } catch (err) {
    console.error("Create user by admin error:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};


export const updateUser = async (req: Request, res: Response) => {
  try {
    const currentUser = req.user;

    if (!currentUser || !["admin", "CSSG_Adviser", "Saso"].includes(currentUser.role)) {
      return res.status(403).json({
        message: "You are not allowed to update users.",
      });
    }

    const { id } = req.params;

    const {
      firstName,
      lastName,
      email,
      role,
      course,
      major,
      studentId,
      yearLevel,
      section,
      gender,
      password,
    } = req.body;

    const userToUpdate = await User.findById(id);

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
      const emailExists = await User.findOne({
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

      if (!gender || !["Male", "Female"].includes(gender)) {
        return res.status(400).json({
          message: "Gender is required for students.",
        });
      }

      const existingStudent = await User.findOne({
        studentId,
        _id: { $ne: id },
      });

      if (existingStudent) {
        return res.status(400).json({
          message: "Student ID already exists.",
        });
      }
    }

    const updateData: any = {
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
      updateData.gender = gender;
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

      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: updatedUser,
    });

  } catch (error: any) {
    console.error("Update user error:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
};

export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password." });
    }


    const user = await User.findOne({
      email: email,
      role: { $in: ["admin", "CSSG_Adviser", "Saso", "CSSG_officer"] },
    }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if (user.isActive === false) {
      return res.status(401).json({ message: "Your account is deactivated. Please contact admin." });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    // Archived accounts: only revealed once the password is correct
    if (user.isDeleted) {
      return res.status(403).json({ message: "Your account has been disabled. Please contact admin." });
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: "7d" }
    );

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
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getCurrentUser = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await User.findById(req.user._id)
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
        gender: user.gender,
        isFaceRegistered: user.isFaceRegistered,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });

  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error.",
    });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Please provide identifier and password.",
      });
    }
    const normalizedIdentifier = identifier.trim();

    // Case-insensitive match: emails / student IDs are stored as typed at
    // registration (e.g. "Juan@sfcg.edu.ph"), so an exact lowercase lookup
    // would reject correct credentials.
    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { studentId: normalizedIdentifier },
      ],
    })
      .collation({ locale: "en", strength: 2 })
      .select("+password");

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

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        message: "Invalid credentials.",
      });
    }

    // Archived accounts: only revealed once the password is correct
    if (user.isDeleted) {
      return res.status(403).json({
        message: "Your account has been disabled. Please contact admin.",
      });
    }

    // Mark this account as mobile-enabled so any route can tell the login
    // came from the mobile app without an extra round trip (unlike pushToken,
    // which needs the client to request permission first).
    user.locationToken = true;
    user.cameraToken = true;
    await user.save();

    let isProfileComplete = true;

    if (user.role === "student" || user.role === "CSSG_officer") {
      const selectedCourse = await Course.findOne({
        name: user.course,
      });

      const hasMajors =
        (selectedCourse?.majors?.length ?? 0) > 0;

      isProfileComplete = Boolean(
        user.yearLevel &&
        user.course &&
        user.section &&
        user.gender &&
        (!hasMajors || user.major)
      );
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        studentId: user.studentId,
        course: user.course,
        section: user.section,
        yearLevel: user.yearLevel,
        major: user.major,
        isFaceRegistered: user.isFaceRegistered,
        avatar: user.avatar,
        locationToken: user.locationToken,
        cameraToken: user.cameraToken
      },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: "7d" }
    );

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
        gender: user.gender,
        profileCompleted: isProfileComplete,
        avatar: user.avatar,
        isFaceRegistered: user.isFaceRegistered,
        locationToken: user.locationToken,
        cameraToken: user.cameraToken
      },
      token,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};


export const completeProfile = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const { yearLevel, course, section, major, gender } = req.body;
    const userId = req.user._id;

    if (!yearLevel || !course || !section) {
      return res.status(400).json({
        message: "Year level, course, and section are required.",
      });
    }

    if (!gender || !["Male", "Female"].includes(gender)) {
      return res.status(400).json({
        message: "Gender is required.",
      });
    }

    const selectedCourse = await Course.findOne({
      name: course.trim(),
    });

    if (!selectedCourse) {
      return res.status(404).json({
        message: "Course not found.",
      });
    }

    const hasMajors =
      (selectedCourse.majors?.length ?? 0) > 0;

    if (hasMajors && !major?.trim()) {
      return res.status(400).json({
        message: "Please select a major for this course.",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        yearLevel: yearLevel.trim(),
        course: course.trim(),
        section: section.trim(),
        gender,

        major: hasMajors ? major.trim() : "",
      },
      {
        new: true,
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    // Re-issue the token so it carries the freshly completed profile claims
    const token = jwt.sign(
      {
        id: updatedUser._id,
        role: updatedUser.role,
        email: updatedUser.email,
        studentId: updatedUser.studentId,
        course: updatedUser.course,
        section: updatedUser.section,
        yearLevel: updatedUser.yearLevel,
        major: updatedUser.major,
        gender: updatedUser.gender,
        isFaceRegistered: updatedUser.isFaceRegistered,
        avatar: updatedUser.avatar,
      },
      process.env.JWT_SECRET || "defaultsecret",
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Profile completed successfully",
      token,
      user: updatedUser,
    });

  } catch (err) {
    console.error("Complete profile error:", err);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

export const updateUserProfileForStudent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { firstName, lastName, yearLevel, course, section, major, gender } = req.body;

    if (!firstName || !lastName || !yearLevel || !course || !section) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    if (!gender || !["Male", "Female"].includes(gender)) {
      return res.status(400).json({
        message: "Gender is required",
      });
    }

    if (firstName.length < 2 || lastName.length < 2) {
      return res.status(400).json({
        message: "Names must be at least 2 characters long",
      });
    }

    let avatarUrl: string | undefined;

    if (req.file) {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "users",
              resource_type: "image",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(req.file!.buffer);
      });

      avatarUrl = uploadResult.secure_url;
    }

    const updateData: any = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      yearLevel: yearLevel.trim(),
      course: course.trim(),
      major: major.trim(),
      section: section.trim(),
      gender
    };

    // ✅ only add avatar if uploaded
    if (avatarUrl) {
      updateData.avatar = avatarUrl;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

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

  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      message: "Failed to update profile",
    });
  }

}

export const requestResetCode = async (
  req: Request,
  res: Response
) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email address.",
      });
    }

    // Case-insensitive: emails are stored as typed at registration
    const user = await User.findOne({ email, ...NOT_DELETED }).collation({ locale: "en", strength: 2 });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email not found. Please check the email address and try again.",
      });
    }

    const code = crypto
      .randomInt(100000, 999999)
      .toString();

    user.resetPasswordCode = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");

    user.resetPasswordExpires = new Date(
      Date.now() + 10 * 60 * 1000
    );

    user.resetPasswordVerified = false;

    await user.save();

    const resendResponse =
      await resend.emails.send({
        from:
          "EduVent <no-reply@eduvent.site>",
        to: user.email,
        subject: "Password Reset Code",
        html: emailTemplate(
          Number(code),
          user.firstName
        ),
      });

    console.log(
      "RESEND RESPONSE:",
      resendResponse
    );

    return res.json({
      success: true,
      message: "Reset code sent to email",
    });

  } catch (err: any) {

    console.log("RESEND ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};


export const verifyResetCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    const hashedCode = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordCode: hashedCode,
      resetPasswordExpires: { $gt: new Date() },
      ...NOT_DELETED,
    }).collation({ locale: "en", strength: 2 });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired code" });
    }

    user.resetPasswordVerified = true;
    await user.save();

    res.json({ message: "Code verified successfully" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordVerified: true,
      resetPasswordExpires: { $gt: new Date() },
      ...NOT_DELETED,
    }).collation({ locale: "en", strength: 2 });

    if (!user) {
      return res.status(400).json({ message: "Reset not verified" });
    }

    user.password = await bcrypt.hash(newPassword, 12);

    // Cleanup
    // user.resetPasswordCode = undefined;
    //  user.resetPasswordExpires = undefined;
    // user.resetPasswordVerified = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};


export const resendResetCode = async (
  req: Request,
  res: Response
) => {

  try {

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email is required",
      });
    }

    const user = await User.findOne({
      email: String(email).trim(),
      ...NOT_DELETED,
    }).collation({ locale: "en", strength: 2 });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Email not found. Please check the email address and try again.",
      });
    }

    // Generate new code
    const code = crypto
      .randomInt(100000, 999999)
      .toString();

    // Hash code
    user.resetPasswordCode =
      crypto
        .createHash("sha256")
        .update(code)
        .digest("hex");

    // Expiration
    user.resetPasswordExpires =
      new Date(
        Date.now() +
        10 * 60 * 1000
      );

    // Reset verification state
    user.resetPasswordVerified =
      false;

    await user.save();

    await resend.emails.send({
      from: "EduVent <no-reply@eduvent.site>",
      to: user.email,
      subject: "Your New Reset Code",
      html: emailTemplate(
        Number(code),
        user.firstName
      ),
    });

    return res.status(200).json({
      success: true,
      message:
        "New reset code sent",
    });

  } catch (err) {

    console.log(
      "RESEND RESET CODE ERROR:",
      err
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    res.clearCookie("user_token", {
      httpOnly: true,
      secure: false,        // true in production (HTTPS)
      sameSite: "lax",      // use "none" + secure:true if cross-site HTTPS
    });
    return res.status(200).json({ message: "Logout successful." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export const checkUserAuth = async (req: Request, res: Response) => {
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
        gender: req.user.gender,
        avatar: req.user.avatar,
      },
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const getUsersSameCourse = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.course) {
      return res
        .status(400)
        .json({ message: "User has no course assigned" });
    }

    const users = await User.find({
      course: req.user.course,
      role: { $ne: "CSSG_Adviser" },
      ...NOT_DELETED,
    }).select("-password");

    return res.json(
      users.map((user) => ({
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        section: user.section,
        course: user.course,
        studentId: user.studentId,
        yearLevel: user.yearLevel,
        gender: user.gender,

        dateAdded: user.createdAt
          ? new Date(user.createdAt).toLocaleDateString()
          : "NA",

        lastActive: user.updatedAt
          ? new Date(user.updatedAt).toLocaleDateString()
          : "NA",
      }))
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};


export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const currentUserRole = req.user?.role;
    // ?deleted=true lists the soft-deleted accounts (for the restore view)
    const showDeleted = req.query.deleted === "true";

    let roleFilter: any = {};

    if (currentUserRole === "admin") {
      roleFilter = { role: { $in: ["student", "CSSG_officer", "CSSG_Adviser", "Saso"] } };
    } else if (currentUserRole === "CSSG_Adviser") {
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

    // Newest accounts first
    const deletedFilter = showDeleted ? { isDeleted: true } : NOT_DELETED;

    const users = await User.find({ ...roleFilter, ...deletedFilter })
      .select("-password")
      .sort(showDeleted ? { deletedAt: -1, _id: -1 } : { createdAt: -1, _id: -1 });

    // Attach the facial-recognition photo (faceUrl) for each user
    const userIds = users.map((user) => user._id.toString());
    const faces = await FaceUser.find({ userId: { $in: userIds } }).select(
      "userId faceUrl"
    );
    const faceUrlByUserId = new Map(
      faces.map((face) => [face.userId, face.faceUrl])
    );

    return res.json(
      users.map((user) => ({
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
        gender: user.gender,
        avatar: user.avatar,
        faceUrl: faceUrlByUserId.get(user._id.toString()) ?? null,
        isFaceRegistered: user.isFaceRegistered,
        isActive: user.isActive,
        isDeleted: user.isDeleted === true,
        deletedAt: user.deletedAt ?? null,
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
      }))
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};


export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const face = await FaceUser.findOne({
      userId: user._id.toString(),
    }).select("faceUrl");

    return res.json({
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
      gender: user.gender,
      avatar: user.avatar,
      faceUrl: face?.faceUrl ?? null,
      isFaceRegistered: user.isFaceRegistered,
      isActive: user.isActive,
      isDeleted: user.isDeleted === true,
      deletedAt: user.deletedAt ?? null,
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
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};


export const DeactivateUserAccount = async (
  req: Request,
  res: Response
) => {

  try {

    const { id } = req.params;

    const user = await User.findById(id);

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

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error"
    });

  }
};

export const getTotalUsers = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: "admin" }, ...NOT_DELETED });
    return res.json({ totalUsers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};


/** Soft delete: the account is flagged and hidden, and can be restored later. */
export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (req.user?._id?.toString() === id) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account" });
    }

    const deleteUser = await User.findOneAndUpdate(
      { _id: id, ...NOT_DELETED },
      {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: req.user?._id ?? null,
        // stop push notifications to the deleted account's device
        pushToken: null,
      },
      { new: true }
    ).select("-password");

    if (!deleteUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({ success: true, deleteUser: deleteUser })
  }
  catch (error) {
    console.error("Internal Server Error", error)
    return res.status(500).json({ success: false, message: "Something went wrong" })
  }
}

export const restoreUserAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const user = await User.findOneAndUpdate(
      { _id: id, isDeleted: true },
      { isDeleted: false, deletedAt: null, deletedBy: null },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "Deleted user not found" });
    }

    return res.status(200).json({ success: true, message: "User restored successfully", user })
  }
  catch (error) {
    console.error("Internal Server Error", error)
    return res.status(500).json({ success: false, message: "Something went wrong" })
  }
}


export const savePushToken = async (req: Request, res: Response) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({ message: "Push token required" });
    }

    await User.findByIdAndUpdate(req.user?._id, {
      pushToken,
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: "Failed to save token" });
  }
};

export const updateUserFullname = async (req: Request, res: Response) => {
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

    let avatarUrl: string | undefined;

    if (req.file) {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "users",
              resource_type: "image",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          )
          .end(req.file!.buffer);
      });

      avatarUrl = uploadResult.secure_url;
    }

    const updateData: any = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };

    // ✅ only add avatar if uploaded
    if (avatarUrl) {
      updateData.avatar = avatarUrl;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

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

  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      message: "Failed to update profile",
    });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    const { newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: "All password fields are required" });
    }


    const hashpassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(userId, { password: hashpassword }, { new: true });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to update password" });
  }

}


export const updateUserRole = async (req: any, res: any) => {
  try {
    const currentUser = req.user;
    const userId = req.params.id;
    const { role } = req.body;

    const VALID_ROLES = ["admin", "Saso", "CSSG_Adviser", "CSSG_officer", "student"];




    // ✅ Validate role
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const userToUpdate = await User.findById(userId);

    if (!userToUpdate) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔐 Permission check
    if (!canAssignRole(currentUser, role)) {
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

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const changeStudentPassword = async (
  req: Request,
  res: Response
) => {

  try {

    const userId =
      req.user._id;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    // VALIDATE
    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {

      return res.status(400).json({
        message:
          "All fields are required",
      });
    }

    // PASSWORD MATCH
    if (
      newPassword !==
      confirmPassword
    ) {

      return res.status(400).json({
        message:
          "Passwords do not match",
      });
    }

    const user =
      await User.findById(
        userId
      );

    if (!user) {

      return res.status(404).json({
        message:
          "User not found",
      });
    }

    const isMatch =
      await bcrypt.compare(
        currentPassword,
        user.password
      );

    if (!isMatch) {

      return res.status(400).json({
        message:
          "Current password is incorrect",
      });
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        12
      );

    user.password =
      hashedPassword;

    await user.save();

    res.status(200).json({
      success: true,
      message:
        "Password updated successfully",
    });

  } catch (error) {

    console.log(
      "CHANGE PASSWORD ERROR:",
      error
    );

    res.status(500).json({
      message:
        "Server error",
    });
  }
};