"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const department_controller_1 = require("./department.controller");
const router = express_1.default.Router();
router.post("/createDepartment", department_controller_1.createDepartment);
router.get("/getDepartments", department_controller_1.getDepartments);
router.put("/updateDepartment/:id", department_controller_1.updateDepartment);
router.delete("/deleteDepartment/:id", department_controller_1.deleteDepartment);
exports.default = router;
//# sourceMappingURL=department.routes.js.map