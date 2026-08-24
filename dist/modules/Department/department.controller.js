"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCourse = exports.updateCourse = exports.getCourses = exports.createCourse = void 0;
const department_Model_1 = require("./department.Model");
/* CREATE COURSE */
const createCourse = async (req, res) => {
    try {
        const { name, description, majors } = req.body;
        if (!name || !description) {
            return res.status(400).json({
                message: "Course name and description are required",
            });
        }
        const existingCourse = await department_Model_1.Course.findOne({
            name,
        });
        if (existingCourse) {
            return res.status(409).json({
                message: "Course already exists",
            });
        }
        if (majors && majors.length > 0) {
            const majorNames = majors.map((m) => m.name.trim().toLowerCase());
            const duplicateMajors = majorNames.filter((item, index) => majorNames.indexOf(item) !== index);
            if (duplicateMajors.length > 0) {
                return res.status(400).json({
                    message: "Duplicate majors are not allowed",
                });
            }
            const existingMajor = await department_Model_1.Course.findOne({
                "majors.name": {
                    $in: majors.map((m) => m.name),
                },
            });
            if (existingMajor) {
                return res.status(409).json({
                    message: "One or more majors already exist",
                });
            }
        }
        const course = await department_Model_1.Course.create({
            name,
            description,
            majors: majors || [],
        });
        return res.status(201).json({
            message: "Course created successfully",
            course,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error",
        });
    }
};
exports.createCourse = createCourse;
/* GET ALL COURSES */
const getCourses = async (_req, res) => {
    try {
        const courses = await department_Model_1.Course.find().sort({
            createdAt: -1,
        });
        return res.json(courses);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error",
        });
    }
};
exports.getCourses = getCourses;
/* UPDATE COURSE */
const updateCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, majors, } = req.body;
        if (majors && majors.length > 0) {
            const majorNames = majors.map((m) => m.name.trim().toLowerCase());
            const duplicateMajors = majorNames.filter((item, index) => majorNames.indexOf(item) !== index);
            if (duplicateMajors.length > 0) {
                return res.status(400).json({
                    message: "Duplicate majors are not allowed",
                });
            }
        }
        const existingCourse = await department_Model_1.Course.findOne({
            name,
            _id: { $ne: id },
        });
        if (existingCourse) {
            return res.status(409).json({
                message: "Course name already exists",
            });
        }
        const course = await department_Model_1.Course.findByIdAndUpdate(id, {
            name,
            description,
            majors,
        }, { new: true });
        if (!course) {
            return res.status(404).json({
                message: "Course not found",
            });
        }
        return res.json({
            message: "Course updated successfully",
            course,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error",
        });
    }
};
exports.updateCourse = updateCourse;
/* DELETE COURSE */
const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params;
        const course = await department_Model_1.Course.findByIdAndDelete(id);
        if (!course) {
            return res.status(404).json({
                message: "Course not found",
            });
        }
        return res.json({
            message: "Course deleted successfully",
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error",
        });
    }
};
exports.deleteCourse = deleteCourse;
//# sourceMappingURL=department.controller.js.map