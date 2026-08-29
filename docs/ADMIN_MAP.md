# Admin back end map

Investigation only. No code and no data changed. Row counts read live from the database.
Verdicts: WORKS (live data, correct wiring), EMPTY (wired fine, table has no rows),
BROKEN (query error, wrong object, dead RPC, mock data), RELIC (spring 2026 data only).

## 1. Tab map (5 sections, 27 tabs)

| Section | Tab | Component | Tables and RPCs | Verdict | Evidence |
| --- | --- | --- | --- | --- | --- |
| People | Roster | AdminUsersTab + AdminMassImport | profiles (535), offices (3) | WORKS | roster renders, archived filtered client side |
| People | Teams and regions | inline teams table + AdminVerticalLeadsPanel + AdminRegionsPanel | teams (7), regions (2), vertical_paths (3), profiles, user_roles, admin_set_region_lead, admin_set_vertical_lead | WORKS | 7 teams return, but 2 leader rows are stale (see section 4) |
| People | Access tiers | AccessTiersPanel | profiles, user_roles (3) | WORKS | tier writes hit user_roles |
| People | Seats | SeatsPanel | seats_rows, create_seat_invite, revoke_seat_invite, set_manager_seat, seat_set_manager, invites (0) | WORKS | all five RPCs exist, invites table is empty by design |
| People | Restore access | RestoreAccessPanel | get_access_reset_rows, get_manager_directory, restore_access, access_reset_2027 (532) | WORKS | 532 reset rows available |
| People | Import leads | LeadsImportPanel | leads_import_preview, leads_import_commit | WORKS | write-only tool, both RPCs exist |
| People | Archived | AdminArchivedTab | profiles, set_roster_state | WORKS | archived profiles list and restore path live |
| Requests | Decisions | TeamLeadApplicationsPanel + AdminQueueTab (useAdminQueue) | team_lead_applications (0), admin_queue_dismissals (3), profiles | EMPTY | queue wiring is correct, team_lead_applications has zero rows |
| Requests | Approvals | inline in AdminTeamPage | profiles pending or rejected | WORKS | waiting and history views both populate |
| Requests | Vertical requests | VerticalRequestsPanel | get_vertical_requests, decide_vertical_request, vertical_applications (0) | EMPTY | RPC returns no rows, table empty |
| Requests | Applications | AdminApplicationsTab | applications (13), applications_pulse, claim_application, log_application_first_touch | WORKS | 13 rows, latest 2026-08-18 |
| Requests | Reactivations | ReactivationRequestsPanel | get_reactivation_requests, restore_access, dismiss_reactivation_request, reactivation_requests (0) | EMPTY | zero requests on file |
| Requests | Pitches | AdminPitchApprovalsTab (usePitchApprovals) | pitch_approval_requests (65) | RELIC | all 65 rows are spring, latest 2026-05-13, zero pending |
| Money | Ladders and production | AdminMoneyTab + PestRevenueImportPanel + RevenueEntryPanel + LeaderboardImportPanel + GainzSheetPanel + FiberInstallsPanel + RanksStacksPanel | rep_commission (0), rep_housing (0), rep_revenue (0), revenue_import_batches (0), revenue_import_images (0), fiber_installs (0), fiber_pay_weeks (0), ranks (7), rank_requirements (14), rank_stacks (80), carriers (13) | EMPTY | ranks and stacks are live; every production and pay-entry table is at zero |
| Content | Playbook | BugSheetEditor + AdminPlaybookTab | playbook_entries (50), app_settings (57) | WORKS | 50 entries, bug sheet setting reads and writes |
| Content | First week | AdminFirstWeekTab | onboarding_days (10) | WORKS | 10 days, latest edit 2026-08-28 |
| Content | Day one course | DayOneCoursePanel | app_settings, training_videos (97), set_day_one_items | WORKS | six-item course order persists in app_settings |
| Content | Drills | AdminDrillsTab | training_drills (25), training_courses (6) | WORKS | 25 drills, latest 2026-08-26 |
| Content | Public site | AdminRecruitingTab + AdminSourcePanel + AdminRecruitingContent + PublicCalcPanel | recruiting_leads (98), recruiting_ref_codes (70), recruiting_faq (6), recruiting_testimonials (0), recruiting_timeline (0), partners (0), public_calc_chips (8), public_pay_bands (8), get_recruiting_funnel, get_ref_code_leaderboard, get_source_breakdown, get_partner_referrals, admin_assign_lead | WORKS | funnel and ref codes live; testimonials, timeline and partners blocks render empty |
| Content | Ask Summit | AdminAssistantTab | assistant_faq (12), assistant_logs (11), profiles | WORKS | 12 FAQ rows, latest 2026-08-28 |
| Settings | Season | inline in AdminTeamPage | app_settings (57) | WORKS | season mode toggle reads and writes |
| Settings | Industries | AdminIndustriesTab + AdminLadderSettings + AdminRegionsPanel | vertical_paths (3), vertical_steps (12), rep_vertical_enrollments (44), ladder_rungs (4), training_courses (6), approve_vertical_step, get_vertical_enrollments, get_pending_vertical_approvals | WORKS | 44 enrollments, 12 steps |
| Settings | Fiber hub | AdminFiberHubTab | app_settings, is_fiber_editor gate | WORKS | fiber editor gate returns true for the two granted users |
| Settings | Themes | AdminThemesTab | verticals (3) | WORKS | three vertical themes editable |
| Settings | Audit log | AdminAuditPanel | audit_log (670), profiles, teams, downline_edges (395), bootcamp_progress (199), user_roles, auto_sync_all_edges | WORKS | 670 audit rows, latest 2026-08-28 |
| Settings | Exports | AdminExportTab + BackupsPanel | profiles, user_roles, lesson_progress, rep_commission (0), rep_signups (8), weekly_one_on_ones_manager (15), weekly_one_on_ones_rookie (37), announcement_posts (4), backup_snapshots (2), backups (does not exist) | BROKEN | BackupsPanel queries `public.backups`, which is not a table in the database; backup_snapshots is the real table |
| Settings | System | inline in AdminTeamPage | app_settings, profiles CSV export | WORKS | toggles persist, CSV export runs client side |

Verdict counts: WORKS 21, EMPTY 4, BROKEN 1, RELIC 1.

## 2. Empty tables: referenced

Empty (0 rows) but read or written somewhere in `src`:

action_items, ai_coach_conversations, app_feedback, blitz_optins, car_group_members,
car_groups, commitment_interviews, fiber_day_numbers, fiber_installs, incentives, invites,
life_pipeline, manager_meeting_submissions, mastery_checks, onboarding_marks,
pairing_requests, partners, recruiting_testimonials, recruiting_timeline, rep_commission,
rep_housing, rep_logistics, rep_triage, revenue_import_batches, revenue_import_images,
sales_log, season_checklist_items, seasons, streak_breaks, team_lead_applications,
team_scripts, training_content, training_content_versions (33 tables).

## 3. Empty tables: orphan

Empty and nothing in `src` or `supabase/functions` names them. Some are still touched
indirectly inside SECURITY DEFINER functions, noted where that is true.

| Table | Note |
| --- | --- |
| announcement_acks | nothing reads it |
| announcement_views | nothing reads it |
| drill_completions | written only inside complete_daily_drill |
| fiber_pay_weeks | written only inside ingest_fiber_week |
| home_question_answers | written only inside answer_home_question |
| lead_activities | written only inside lead RPCs |
| lead_call_cursors | written only inside call mode RPCs |
| manager_notifications | nothing reads it |
| manager_spreadsheets | nothing reads it |
| manual_chapter_progress | nothing reads it |
| reactivation_requests | read only through get_reactivation_requests |
| rep_revenue | written only inside apply_revenue_import and upsert_rep_revenue |
| season_results | written only inside finalize_season |
| sweep_sessions | nothing reads it |
| vertical_application_approvals | nothing reads it |
| vertical_applications | read only through get_vertical_requests |
| vet_leads | written only by the submit-vet-lead function path |
| winback_contacts | nothing reads it |

Orphan count: 18.

## 4. Stale data notes

- teams.leader_id: Quality Control still points at Joshua Bingham, who is no longer with
  the company. PARKS has no leader at all. The other five (Legion Mafia, Apex, Minions,
  Paper Route, Atlas) resolve to current people.
- people_leads.roster_status: not_on_roster 409, out 100, in_market 34, off_market 8. The
  34 in_market rows still include people who have left, Bingham among them.
- Admin tabs that read profiles with no archived filter, so departed people can surface:
  AdminApplicationsTab, AdminAssistantTab, AdminAuditPanel, AdminFeedbackTab,
  AdminPlaybookTab, AdminSubmittedVideosTab, HierarchySyncTab, RankOverrideSelect.
- Components that exist but are mounted nowhere: AdminCultureTab, AdminFeedbackTab,
  AdminQuestionsTab, HierarchySyncTab, BootcampDemoWalkthrough.
- Spring-only data sets: pitch_approval_requests (latest 2026-05-13),
  weekly_one_on_ones_manager (latest 2026-04-06), scheduling_requests (latest 2026-03-02),
  training_videos (latest 2026-03-11).
