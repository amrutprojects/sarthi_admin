/* Public API of the students module (import + register). Other modules import only from here (npm run check:boundaries). */
export {
  NO_TRACK,
  studentApi,
  type BucketCounts,
  type StudentBatchRef,
  type StudentBucket,
  type StudentDetail,
  type StudentDocument,
  type StudentListItem,
  type StudentListQuery,
  type StudentSource,
  type StudentSummary,
  type StudentView,
} from './services/importApi';
export { useStudentList, useStudentSummary } from './hooks/useStudents';
export {
  SOURCE_LABEL,
  asOfLabel,
  centreCounts,
  centreIndex,
  monthLabel,
  pctOf,
  sourceItems,
  studentListLink,
  topCentres,
  trackItems,
} from './services/studentFigures';
export { ServerTable, fmtDate, type ServerColumn } from './components/importUi';
export { profileGroups, scoreLabel, studentStatusLabel, type ProfileGroups, type ProfilePair } from './services/studentProfile';
