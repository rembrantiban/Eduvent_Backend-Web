"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartment = exports.updateDepartment = exports.getDepartments = exports.createDepartment = void 0;
const department_Model_1 = require("./department.Model");
/* CREATE DEPARTMENT */
const createDepartment = async (req, res) => {
    try {
        const { code, name, description, majors } = req.body;
        if (!code || !name || !description) {
            return res.status(400).json({
                message: "Code, name, and description are required",
            });
        }
        const existingDepartment = await department_Model_1.Department.findOne({
            $or: [{ name }, { code }],
        });
        if (existingDepartment) {
            return res.status(409).json({
                message: "Department already exists",
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
            const existingMajor = await department_Model_1.Department.findOne({
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
        const department = await department_Model_1.Department.create({
            code,
            name,
            description,
            majors: majors || [],
        });
        return res.status(201).json({
            message: "Department created successfully",
            department,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error",
        });
    }
};
exports.createDepartment = createDepartment;
const getDepartments = async (_req, res) => {
    try {
        const departments = await department_Model_1.Department.find().sort({
            createdAt: -1,
        });
        return res.json(departments);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error",
        });
    }
};
exports.getDepartments = getDepartments;
const updateDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const { code, name, description, majors, } = req.body;
        if (majors && majors.length > 0) {
            const majorNames = majors.map((m) => m.name.trim().toLowerCase());
            const duplicateMajors = majorNames.filter((item, index) => majorNames.indexOf(item) !== index);
            if (duplicateMajors.length > 0) {
                return res.status(400).json({
                    message: "Duplicate majors are not allowed",
                });
            }
        }
        const department = await department_Model_1.Department.findByIdAndUpdate(id, {
            code,
            name,
            description,
            majors,
        }, { new: true });
        if (!department) {
            return res.status(404).json({
                message: "Department not found",
            });
        }
        return res.json({
            message: "Department updated successfully",
            department,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error",
        });
    }
};
exports.updateDepartment = updateDepartment;
const deleteDepartment = async (req, res) => {
    try {
        const { id } = req.params;
        const department = await department_Model_1.Department.findByIdAndDelete(id);
        if (!department) {
            return res.status(404).json({
                message: "Department not found",
            });
        }
        return res.json({
            message: "Department deleted successfully",
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Server error",
        });
    }
};
exports.deleteDepartment = deleteDepartment;
//# sourceMappingURL=department.controller.js.map