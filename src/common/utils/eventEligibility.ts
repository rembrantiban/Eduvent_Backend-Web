import { QueryFilter } from "mongoose";
import { Course } from "../../modules/Department/department.Model";
import { IEvent } from "../../modules/Event/event.Model";
import { IUser } from "../../modules/User/user.Model";

type EventTargets = Pick<
  IEvent,
  | "isForAllStudents"
  | "targetDepartments"
  | "targetYearLevels"
  | "targetMajors"
  | "targetSections"
>;

type StudentProfile = Pick<IUser, "course" | "major" | "yearLevel" | "section">;

/*
  Majors only narrow down courses that actually had a major picked.
  A targeted course with no majors (e.g. BSIS, students saved as "N/A")
  accepts every student in that course.
*/

/** Names of the courses that have at least one of the event's target majors */
const coursesWithTargetedMajors = async (
  event: EventTargets
): Promise<string[]> => {
  const targetMajors = event.targetMajors ?? [];
  if (!targetMajors.length) return [];

  const courses = await Course.find({
    "majors.name": { $in: targetMajors },
  }).select("name");

  return courses.map((c) => c.name);
};

/** Mongo filter for the students eligible for an event (add role / NOT_DELETED yourself) */
export const buildEligibleStudentFilter = async (
  event: EventTargets
): Promise<QueryFilter<IUser>> => {
  if (event.isForAllStudents) return {};

  const and: QueryFilter<IUser>[] = [];

  if (event.targetDepartments?.length)
    and.push({ course: { $in: event.targetDepartments } });

  if (event.targetYearLevels?.length)
    and.push({ yearLevel: { $in: event.targetYearLevels } });

  if (event.targetSections?.length)
    and.push({ section: { $in: event.targetSections } });

  if (event.targetMajors?.length) {
    const majorCourses = await coursesWithTargetedMajors(event);
    and.push({
      $or: [
        { course: { $nin: majorCourses } },
        { major: { $in: event.targetMajors } },
      ],
    });
  }

  return and.length ? { $and: and } : {};
};

/** Major names of a course, for checking many events against one student */
export const loadCourseMajors = async (
  courseName?: string
): Promise<string[]> => {
  if (!courseName) return [];
  const course = await Course.findOne({ name: courseName }).select("majors");
  return course?.majors.map((m) => m.name) ?? [];
};

/** In-memory version of buildEligibleStudentFilter for a single student */
export const isStudentEligible = (
  event: EventTargets,
  student: StudentProfile,
  studentCourseMajors: string[]
): boolean => {
  if (event.isForAllStudents) return true;

  const inList = (list: string[] | undefined, value?: string): boolean =>
    !list?.length || (value !== undefined && list.includes(value));

  const targetMajors = event.targetMajors ?? [];
  const courseHasTargetedMajor = studentCourseMajors.some((m) =>
    targetMajors.includes(m)
  );

  const majorMatch =
    !targetMajors.length ||
    !courseHasTargetedMajor ||
    targetMajors.includes(student.major);

  return (
    inList(event.targetDepartments, student.course) &&
    inList(event.targetYearLevels, student.yearLevel) &&
    inList(event.targetSections, student.section) &&
    majorMatch
  );
};
