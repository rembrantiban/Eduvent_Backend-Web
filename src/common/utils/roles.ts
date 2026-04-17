
const canAssignRole = (currentUser: any, newRole: string) => {
  const rules: any = {
    admin: ["admin", "Saso", "CSSG_Adviser", "CSSG_officer", "student"],
    Saso: ["CSSG_Adviser", "CSSG_officer", "student"],
    CSSG_Adviser: ["CSSG_officer", "student"],
  };

  return rules[currentUser.role]?.includes(newRole);
};

export default canAssignRole;