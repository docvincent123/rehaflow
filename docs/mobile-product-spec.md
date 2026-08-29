# RehaFlow Mobile — Doctor & Nurse Product Specification

## Purpose
RehaFlow Mobile is the clinical companion for doctors, nurses and rehabilitation specialists. It uses the existing RehaFlow API and data model; it must not create a separate patient/user database.

## Roles
- DOCTOR: view assigned patients, review history, create prescriptions/assignments, choose recipient role, set urgency and due time.
- NURSE: receive nurse tasks, claim a task, start it, complete it, add execution notes, review patient context.
- REHAB_SPECIALIST: receive rehabilitation tasks, claim, execute, complete, add notes.
- ADMIN remains web/desktop-oriented.

## Core workflow
Doctor → Patient → New prescription → Recipient role (Nurses / Rehab specialists) → task notification → first eligible worker taps Claim → task is atomically assigned → Start → Complete → execution record appears in patient history.

## Mobile screens
- Sign in / session restore / sign out
- Home dashboard
- My shift
- Patients
- Patient overview
- Patient history timeline
- Prescriptions (doctor)
- Tasks queue
- Task detail / claim / start / complete
- Notifications
- Profile / settings
- Devices
- QR workflow

## Task states
NEW → CLAIMED → IN_PROGRESS → COMPLETED
Optional terminal states: CANCELLED, EXPIRED.

## Task rules
- Only doctors can create clinical prescriptions.
- Nurses can only claim/complete nurse-targeted tasks.
- Rehab specialists can only claim/complete rehab-targeted tasks.
- Claim must be server-side atomic so only the first eligible user gets the task.
- Completion writes the execution/result into the patient history/audit trail.

## Patient context
Every task should expose enough context to work safely: patient name, room, bed, task title, details, scheduled time, priority, and relevant recent history available to the role.

## Shift workflow
- Detect whether the current user has an active shift.
- Prompt to start shift when appropriate.
- Show shift status and task counts.
- Before ending a shift, warn about unfinished tasks and allow the server-supported handoff/closure workflow.

## Notifications
- New task notification for eligible workers.
- Task claimed by another worker notification when applicable.
- Completion notification to the ordering clinician when supported.
- Read/unread badge state must be consistent across the app and backend.

## Offline / performance
- Keep cached patient/task data available for fast screen open.
- Queue supported writes while offline using the existing action queue.
- Prefer background refresh over blocking the UI.
- Show explicit online/offline state.

## API / deployment
- All clinical data comes from the configured RehaFlow API.
- The mobile app must not hard-code a private clinic database connection.
- Clinic-specific server/API configuration is external to the clinical data model.

## APK delivery
- GitHub Actions must build a release APK without relying on EAS build quota.
- APK is distributed manually to clinic tablets/phones.
- Release signing must remain stable for in-place updates between versions.
