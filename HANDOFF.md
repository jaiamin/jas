# JAS handoff

MVP redesign implementation follows [the acceptance matrix](docs/MVP_REDESIGN_PLAN.md).
v0.2 features are excluded. Product and architecture decisions live in docs/adr/;
setup, testing, publishing and hosting each have focused guides in docs/.

The runner and provider keys stay local. The separate public gallery has no model
execution service. Preserve the existing Railway service/volume; no redeploy or
provisioning is part of this review. The local app is to remain on port 8080.

Local verification: 1,969 backend tests, 146 frontend tests and 201 browser tests
passed. Final affected checks add 33 backend cases, 19 viewer/workspace browser
cases, nine starter/catalogue cases and two anonymous gallery phone/theme cases.
Ruff, formatting, ty, frontend lint/build and Actionlint/ShellCheck pass. The final
wheel serves its bundled UI/recordings from an unrelated working directory with
zero model calls. Private-hosting and separate-gallery container smokes pass.
The README includes an actual 20-second scripted replay capture.

Backend/browser regression logs and retained live evaluation evidence are kept in
the ignored task workspace. Internal research
reports and the previous detailed handoff were byte-checked into a private local
archive before removal from the current public tree; Git history is intact.

Local review uses `data/workspace` on port 8080. No existing workspace was reset,
no Railway resources changed, and no launch-corpus model calls were made.
Inside the sandbox, start with `.venv/bin/jas --workspace ./data/workspace
--host 0.0.0.0 --port 8080 --no-browser` so the host's existing loopback port
mapping reaches the app. Keep the localhost Host/origin protections enabled.

Reply-cost follow-up: Copy/cost spacing is 4px; the popup shows recorded models,
tokens and the estimate to microdollar precision, without its normal footer paragraph.
Footer estimates use at most three decimal places; positive costs below $0.001
show `<$0.001`, while a genuine zero remains `$0.00`. Popup precision is unchanged.
Settlement now uses recorded SDK cache pricing for bundled prices, preserves custom
prices, and retains reservations when provider usage is missing. Two existing local
receipts were corrected from their saved SDK costs with a private backup/correction
log in `.tools/workspace-backups`; request/response evidence was byte-checked unchanged.
No provider calls were made. Follow-up verification passed 60 backend tests, all 149
frontend tests, lint/build, Ruff/format and ty, plus desktop/light and 320px/dark browser
checks and Escape focus restoration. The additional full backend run was interrupted
by SIGTERM at 32%; it did not finish and is not a fresh full-suite pass.
The first Markdown block no longer adds its own top margin: browser measurements
now show the same 11px block gap after Activity for heading- and paragraph-led replies
(previously 27px versus 11px). All frontend tests/lint/build passed again afterward.

External launch gates: registry publication, live GitHub/S3/keychain integration,
actual cross-machine publish/fork, provider terms, genuine launch corpus and the
specified outside-user checks. Hosted CI previously could not start because of
GitHub billing limits; local checks do not resolve that account-level block.
