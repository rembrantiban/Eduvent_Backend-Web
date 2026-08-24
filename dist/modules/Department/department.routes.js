"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const department_controller_1 = require("./department.controller");
const router = express_1.default.Router();
router.post("/create", department_controller_1.createCourse);
router.get("/getall", department_controller_1.getCourses);
router.put("/update/:id", department_controller_1.updateCourse);
router.delete("/delete/:id", department_controller_1.deleteCourse);
exports.default = router;
//# sourceMappingURL=department.routes.js.map