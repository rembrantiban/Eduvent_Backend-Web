import { Request, Response } from "express";
import { User, IUser } from "./user.Model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import crypto from "crypto";
import { resend } from "../../common/lib/resend";


const SALT_ROUNDS = 12;

export const signupUser = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password, role, studentId, yearLevel, department, section } = req.body;

    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format." });
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

    if (role === "student") {
      newUser.studentId = studentId;
      newUser.yearLevel = yearLevel;
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
        section: createdUser.section,
      },
      token, 
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
    (user.yearLevel && user.department && user.section);


    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        email: user.email,
        studentId: user.studentId,
        department: user.department,
        section: user.section,
        yearLevel: user.yearLevel,
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
        section: user.section,
        profileCompleted: isProfileComplete,
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
    try{
         const { yearLevel, department, section } = req.body;
         const userId = req.user._id;

         if (!yearLevel || !department || !section) {
           return res.status(400).json({ message: "Please provide all required fields." });
         }
          const updatedUser = await User.findByIdAndUpdate(
            userId,
            { yearLevel, department, section },
            { new: true }
          );

          if (!updatedUser) {
            return res.status(404).json({ message: "User not found." });
          }

          return res.status(200).json({
            messege:"Profile completed successfully.",
            user: {
              id: updatedUser._id,
              firstName: updatedUser.firstName,
              lastName: updatedUser.lastName,
              email: updatedUser.email,
              role: updatedUser.role,
              studentId: updatedUser.studentId,
              yearLevel: updatedUser.yearLevel,
              department: updatedUser.department,
              section: updatedUser.section, 
    }
          });
    }
    catch(err){
      console.error(err);
      return res.status(500).json({ message: "Internal server error" });
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