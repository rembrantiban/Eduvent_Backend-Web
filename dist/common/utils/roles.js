"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const canAssignRole = (currentUser, newRole) => {
    const rules = {
        admin: ["admin", "Saso", "CSSG_Adviser", "CSSG_officer", "student"],
        Saso: ["CSSG_Adviser", "CSSG_officer", "student"],
        CSSG_Adviser: ["CSSG_officer", "student"],
    };
    return rules[currentUser.role]?.includes(newRole);
};
exports.default = canAssignRole;
//# sourceMappingURL=roles.js.map