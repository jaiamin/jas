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

External launch gates: registry publication, live GitHub/S3/keychain integration,
actual cross-machine publish/fork, provider terms, genuine launch corpus and the
specified outside-user checks. Hosted CI previously could not start because of
GitHub billing limits; local checks do not resolve that account-level block.
