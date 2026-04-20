export { adminCourse } from './adminCourse';
export { standardUserCourse } from './standardUserCourse';
export { howToDocs } from './howToDocs';

import { adminCourse } from './adminCourse';
import { standardUserCourse } from './standardUserCourse';
import type { Course } from '../types';

export const allCourses: Course[] = [adminCourse, standardUserCourse];
