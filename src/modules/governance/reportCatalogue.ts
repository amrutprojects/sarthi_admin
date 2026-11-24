/*
 * The standard programme reports (names and purpose only, no data). None has a live data source yet, so the
 * Reports & MIS screen says so on every report and each report opens an empty state.
 */
export const REPORT_CATALOGUE: [id: string, title: string, description: string][] = [
  ['state', 'State Dashboard Report', 'Consolidated state-level programme performance'],
  ['district', 'District Report', 'District-wise targets, achievement and status'],
  ['taluka', 'Taluka Report', 'Taluka-level rollup within a district'],
  ['centre', 'Centre Report', 'Centre performance, capacity and scoring'],
  ['batch', 'Batch Report', 'Batch register with progress and attendance'],
  ['student', 'Student Report', 'Full candidate master extract'],
  ['attendance', 'Attendance Report', 'Attendance by district, centre, batch and student'],
  ['assessment', 'Assessment Report', 'Theory, practical and pass rates'],
  ['certification', 'Certification Report', 'Certificates generated, issued and verified'],
  ['trainer', 'Trainer Report', 'Trainer pool, ToT and performance'],
  ['marketing', 'Marketing Report', 'Campaign reach, leads and conversion'],
  ['mobilization', 'Mobilization Report', 'Lead to enrollment conversion'],
  ['mode', 'Training Mode Report', 'Offline vs online comparison'],
  ['completion', 'Completion Report', 'Completion and dropout analysis'],
];
