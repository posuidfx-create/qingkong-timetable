---
name: excel-timetable
description: Analyze, design, implement, test, or review the university timetable Excel importer for this project, especially parsing workbook structure, merged cells, weeks, sections, teachers, academic advisors, classrooms, and warnings. Use for work involving `reference/中外合作办学课表.xlsx` or `src/lib/importTimetable.ts`; do not use for unrelated spreadsheet tasks.
---

# Excel Timetable

Build a tolerant, auditable importer for real university timetable workbooks. Preserve recoverable course information and surface uncertainty as warnings instead of silently dropping records.

## Required discovery

Before implementing or materially changing the parser, inspect the real workbook at `reference/中外合作办学课表.xlsx`. Determine its workbook and worksheet structure, merged ranges, weekday columns, section rows, major or grade headers, multiline cell conventions, and representative course patterns. Do not infer the format solely from filenames or assumptions.

## Parser boundary

- Keep the Excel parser independent of React in `src/lib/importTimetable.ts`.
- Keep cell normalization and extraction logic in small testable functions, such as `normalizeCellText()`, `parseCourseCell()`, `parseWeekExpression()`, `extractTeacher()`, and `extractClassroom()`.
- Return structured output shaped around `ImportResult { courses, warnings, metadata }`; refine the exact types in the project's domain type files.
- Make parsing tolerant. Failure to identify a teacher or classroom must not discard an otherwise usable course.

## Data to preserve

Handle workbook and worksheet metadata, merged cells, weekday placement, section ranges, major or grade labels, multiline text, course name, week expression, teacher, academic advisor, classroom, consecutive sections, and multiple courses occupying the same weekday and sections in different weeks.

At minimum, support week expressions equivalent to:

- `1-16周`
- `2-5周`
- `10-12周`
- `13-16周`
- `1,3,5,7周`
- `单周`
- `双周`

Do not merge courses merely because their weekday and section range match; compare their week sets and other identity fields.

## Extraction rules

- Treat a value explicitly labeled `授课教师` as the preferred `teacher`.
- Never allow `学术导师` to overwrite the teacher. Preserve the academic advisor in `note` or dedicated metadata.
- Extract classrooms conservatively. Numeric content alone is not evidence of a classroom.
- Preserve original text or relevant fragments in metadata when normalization would otherwise lose useful context.

## Merged cells and section ranges

- Resolve merged ranges deliberately and emit each logical course once.
- Do not generate duplicates for placeholder cells covered by a merged range.
- Represent a course spanning sections 1–2 as `startSection: 1` and `endSection: 2`, not as two courses.
- Keep courses at the same weekday and section range separate when their active weeks differ.

## Warnings and tests

Use warnings for recoverable ambiguity, including:

- unrecognized teacher
- unrecognized classroom
- unrecognized week expression
- unknown format
- suspected duplicate
- suspected course text that could not be parsed

Add focused tests for normalization, every supported week form, teacher versus academic-advisor precedence, conservative classroom extraction, merged-cell deduplication, consecutive sections, recoverable partial parsing, and same-time courses with different week sets.
