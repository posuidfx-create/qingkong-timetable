\# AGENTS.md



\## Project Overview



This project is a mobile-first university timetable web application.



The product experience is inspired by modern timetable apps such as WakeUp Course Schedule, but must NOT copy proprietary branding, logos, copyrighted graphics, or protected UI assets.



The application language is primarily Simplified Chinese.



The goal is to build a polished, practical timetable PWA that students can actually use every day.



The timetable is the core experience of the entire product.



\---



\# 1. Product Goals



The finished product should feel like a real mobile app.



It should NOT look like:



\- an admin dashboard

\- a generic desktop website

\- a Bootstrap page

\- a traditional HTML table

\- a business management panel

\- a desktop UI squeezed onto a phone



The visual direction should be:



\- clean

\- calm

\- modern

\- youthful

\- mobile-first

\- iOS-inspired

\- high information density without clutter

\- suitable for daily student use



\---



\# 2. Main Technology Stack



Use:



\- React

\- TypeScript

\- Vite

\- Tailwind CSS

\- shadcn/ui

\- Lucide React

\- Zustand

\- date-fns

\- SheetJS / xlsx

\- vite-plugin-pwa

\- Vitest



Avoid unnecessary dependencies.



Do not introduce heavy UI frameworks unless absolutely necessary.



Do NOT use:



\- Bootstrap

\- Ant Design

\- Element Plus

\- Material UI



unless the user explicitly asks for them.



\---



\# 3. TypeScript Rules



Use strict TypeScript.



Avoid `any`.



Create clear domain types.



Prefer explicit interfaces/types.



Business logic should use pure functions whenever practical.



Do not hide type errors with unsafe casting.



Do not finish a task while TypeScript errors remain.



\---



\# 4. Project Structure



Do not place the entire application inside App.tsx.



Use a modular structure similar to:



```text

src/

&#x20; components/

&#x20;   timetable/

&#x20;     TimetableGrid.tsx

&#x20;     TimetableHeader.tsx

&#x20;     WeekHeader.tsx

&#x20;     CourseCard.tsx

&#x20;     SectionColumn.tsx

&#x20;     CourseDetailSheet.tsx

&#x20;     CourseFormSheet.tsx

&#x20;     ImportPreviewSheet.tsx



&#x20; pages/

&#x20;   TimetablePage.tsx

&#x20;   TodoPage.tsx

&#x20;   StatisticsPage.tsx

&#x20;   ProfilePage.tsx



&#x20; store/

&#x20;   timetableStore.ts



&#x20; lib/

&#x20;   timetable.ts

&#x20;   weekParser.ts

&#x20;   importTimetable.ts

&#x20;   storage.ts

&#x20;   date.ts

&#x20;   conflict.ts



&#x20; hooks/



&#x20; types/

&#x20;   timetable.ts



&#x20; assets/

