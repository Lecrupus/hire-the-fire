Scope: the recruiter workspace (dashboard, pipeline, my jobs, job form, company) and, inheriting the same world, the seeker and public pages. Visitor mode: Operate.

Audience and task: recruiters triaging applicants daily on desktop; the next move on each applicant is the job. Seekers track their own applications on mobile.

Constraints: PRODUCT.md principles; plain CSS Modules, no UI kit; WCAG AA; 360 px floor.

## Direction contract

THESIS: Every application is a consignment that is booked, moved, stamped and delivered. Refuses the category default of a white KPI-card row above kanban columns.

OWN-WORLD: Postal red (#B3121F) owns the navigation rail. Sorting yellow (#F5B700) marks the current job and share bars. Ink near-black text sits on a cool grey ground (#F5F6F8) with white work surfaces. Postmark violet (#5A4FA0) is reserved for status history. Archivo carries the UI; Martian Mono carries IDs, dates and column labels in a dot-matrix voice. Flat surfaces, hairline rules, 4-6 px radii, no shadows beyond focus.

STORY: The recruiter sees where every applicant stands and how they got there, then moves them on in one click. The trail makes the history readable without opening anything.

FIRST VIEWPORT: Left rail (248 px, postal red) with brand, nav and the open-jobs list, current job in yellow. Main column: job tracking ID in mono above the job title, with an Edit action at right. A six-cell stage strip with counts and share bars. Search and sort filters. Applicant table with columns for nameplate, skill match, applied date, status badge and trail. The trail is a row of dated postmarks; the latest one is filled. The primary action sits per row as a status move.

FORM: Speed Post consignment tracking, candidate 4 of 7 on the ordered list. seed:e51a148e3a3d2ffa. Raises: nothing disappears, it cancels (from ticket wallet); columns never move, rows reorder by last move (from split-flap); a fixed nameplate per applicant (from character catalog); stage tabs carry share bars (from acetate manual). Signature move: the postmark trail, stamped with a short 2-frame motion only when a status actually changes.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
