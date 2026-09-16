# Connect the question sheet to owner follow-up

## Outcome
A visitor answers the three opening questions, continues into the existing rookie or veteran application, submits their contact details, and creates an in-app notification for the owner with a direct link to the application queue.

## What will change
- Keep the current sheet-to-application handoff, including its rookie/veteran routing and location prefill.
- Preserve the existing protected public submission function, validation, rate limits, and application record.
- Update the existing new-application notification so it includes the applicant's name, phone, email, location, selected industry, and whether they requested a call.
- Keep notifications limited to owner and admin accounts and link them to the Applications screen.
- Verify the full public flow from sheet answers through a successful application submission and confirm the notification appears with the expected details.

## Technical details
- Reuse `submit-application`, `applications`, and `user_notifications`; no new table or dependency is needed.
- Change the existing `notify_new_application` database trigger function through a migration.
- Keep the existing duplicate protection so repeated submissions within 24 hours do not create duplicate application alerts.
