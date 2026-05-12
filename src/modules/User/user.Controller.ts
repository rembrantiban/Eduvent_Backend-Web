import { Request, Response } from "express";
import { User, IUser } from "./user.Model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import crypto from "crypto";
import { resend } from "../../common/lib/resend";
import cloudinary from "../../config/cloudinary"
import  canAssignRole  from "../../common/utils/roles"
const SALT_ROUNDS = 12;

export const signupUser = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, role, studentId, yearLevel, major, department, section } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    if (!validator.isStrongPassword(password, {
      minLength: 6,
      minNumbers: 1,
      minLowercase: 1,
      minUppercase: 0,
      minSymbols: 0
    })) {
      return res.status(400).json({ message: "Password must be at least 6 characters and contain at least 1 number and 1 letter." });
    }

    if (role === "student") {
      if (!studentId || !firstName || !lastName || !password || !email) {
        return res.status(400).json({ message: "Student ID, first name, last name, and password are required for students." });
      }
    }
    if (role === "CSSG_officer") {
      if (!studentId || !yearLevel || !department || !section) {
        return res.status(400).json({
          message: "All student fields are required for this role."
        });
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
      newUser.department = department;
      newUser.section = section;
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
        department: createdUser.department,
        major: createdUser.major,
        section: createdUser.section,
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

    const department = req.user.department;

    // Default password
    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role,
      department,
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
        department: newUser.department,
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
      department,
      studentId,
      yearLevel,
      section,
      major,
    } = req.body;

    // ✅ Allowed roles
    if (!["CSSG_Adviser", "student", "CSSG_officer", "Saso"].includes(role)) {
      return res.status(403).json({
        message: "Invalid role. Admin can only create CSSG Adviser  , student, CSSG officer, or Saso.",
      });
    }

    // ✅ Required fields
    if (!firstName || !lastName || !email || !password || !role || !department) {
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
      department,
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
        department: newUser.department,
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
      department,
      studentId,
      yearLevel,
      section,
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

      if (userToUpdate.department !== currentUser.department) {
        return res.status(403).json({
          message: "You can only update users in your department.",
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
      department,
    };

    if (isStudentRole) {
      updateData.studentId = studentId;
      updateData.yearLevel = yearLevel;
      updateData.section = section;
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

    if(user.isActive === false) {
      return res.status(401).json({ message: "Your account is deactivated. Please contact admin." });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials." });
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
        department: user.department,
        avatar: user.avatar,
        isFaceRegistered: user.isFaceRegistered
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
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
    const normalizedIdentifier = identifier.trim().toLowerCase();

    const user = await User.findOne({
      $or: [
        { email: normalizedIdentifier },
        { studentId: normalizedIdentifier },
      ],
    }).select("+password");

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

    const isProfileComplete =
      user.role !== "student" ||
      (user.yearLevel && user.department &&  user.section && user.major);


    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        studentId: user.studentId,
        department: user.department,
        section: user.section,
        yearLevel: user.yearLevel,
        major: user.major,
        isFaceRegistered: user.isFaceRegistered,
        avatar: user.avatar
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
        department: user.department,
        major: user.major,
        section: user.section,
        profileCompleted: isProfileComplete,
        avatar: user.avatar,
        isFaceRegistered: user.isFaceRegistered
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
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { yearLevel, department, section, major } = req.body;
    const userId = req.user._id;

    if (!yearLevel || !department || !section || !major) {
      return res.status(400).json({
        message: "Please provide all required fields.",
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        yearLevel: yearLevel.trim(),
        department: department.trim(),
        section: section.trim(),
        major: major.trim(),
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Profile completed successfully",
      user: updatedUser,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const updateUserProfileForStudent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;
    const { firstName, lastName, yearLevel, department, section, major } = req.body;

    if (!firstName || !lastName || !yearLevel || !department || !section || !major) {
      return res.status(400).json({
        message: "All fields are required",
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
      department: department.trim(),
      major: major.trim(),
      section: section.trim()
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

export const requestResetCode = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();

    user.resetPasswordCode = crypto
      .createHash("sha256")
      .update(code)
      .digest("hex");

    user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    user.resetPasswordVerified = false;

    await user.save();

    await resend.emails.send({
      from: "no-reply@yourdomain.com",
      to: email,
      subject: "Password Reset Code",
      text: `Your password reset code is: ${code}\nExpires in 10 minutes.`,
    });

    res.json({ message: "Reset code sent to email" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
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
    });

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
    });

    if (!user) {
      return res.status(400).json({ message: "Reset not verified" });
    }

    user.password = await bcrypt.hash(newPassword, 12);

    // Cleanup
    user.resetPasswordCode = undefined;
    user.resetPasswordExpires = undefined;
    user.resetPasswordVerified = undefined;

    await user.save();

    res.json({ message: "Password reset successful" });
  } catch {
    res.status(500).json({ message: "Server error" });
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
        department: req.user.department,
        avatar: req.user.avatar,
      },
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const getUsersSameDepartment = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!req.user.department) {
      return res
        .status(400)
        .json({ message: "User has no department assigned" });
    }

    const users = await User.find({
      department: req.user.department,
      role: { $ne: "teacher" },
    }).select("-password");

    return res.json(
      users.map((user) => ({
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        section: user.section,
        department: user.department,
        studentId: user.studentId,
        yearLevel: user.yearLevel,

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

    const users = await User.find(roleFilter).select("-password");

    return res.json(
      users.map((user) => ({
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        section: user.section,
        department: user.department,
        major: user.major,
        studentId: user.studentId,
        yearLevel: user.yearLevel,
        avatar: user.avatar,
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
      }))
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};


export const DeacticvateUserAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deactivatedUser = await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!deactivatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({ message: "User account deactivated successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getTotalUsers = async (req: Request, res: Response) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: "admin" } });
    return res.json({ totalUsers });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};


export const deleteUserAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleteUser = await User.findByIdAndDelete(id);

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
