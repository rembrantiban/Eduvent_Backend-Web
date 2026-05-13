"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const location_Controller_1 = require("./location.Controller");
const router = express_1.default.Router();
router.post("/createLocation", location_Controller_1.createLocation);
router.get("/getLocations", location_Controller_1.getLocation);
router.put("/updateLocation/:id", location_Controller_1.updateLocation);
router.delete("/deleteLocation/:id", location_Controller_1.deleteLocation);
exports.default = router;
//# sourceMappingURL=location.routes.js.map