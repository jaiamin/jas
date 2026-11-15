# Gallery operations

The project owner initially operates moderation, features experiments by hand and
handles takedowns. The gallery is a separate service, database and private object
store; it must never share the runner's volume, provider keys or configuration.
[Deployment](DEPLOYMENT.md) describes the optional gallery target.

## Before public launch

- Publish and verify the release package; test installation from a clean machine.
- Set an HTTPS origin and GitHub OAuth application callback at
  `https://YOUR-GALLERY/auth/github/callback`. Public reading stays anonymous.
- Configure a private S3-compatible bucket and narrowly scoped bucket credentials.
  Block direct public reads. Keep SQLite and object storage backups together.
- Complete real GitHub browser/device login and OS-keychain checks on supported
  platforms; automated fixtures do not establish provider integration.
- Test publish on one machine and fork/replay on another, including token
  revocation, unpublish, cached URLs and reports.
- Review provider output-sharing terms. Seed 10–15 genuine experiments and perform
  the spec's cold-viewer, clean-install and outsider run/publish checks.
- Verify hosted CI actually starts and passes. Previously observed GitHub billing
  limits need an account-owner fix; local success is not hosted CI success.

Local checks do not establish a live deployment or genuine launch corpus. Track
service, storage and egress costs against the initial $10/month operating target.

## Limits and terms

The gallery enforces a 25 MiB uncompressed JSON maximum, ten publications per
GitHub account per UTC day (including later-unpublished versions), and a seven-day
minimum account age. Reports are limited to five per source per UTC day. Restarting
the service rotates the short-lived report-source salt; this is a small launch
safeguard rather than a complete abuse-prevention system.

The public `/terms` page describes transcript content, author responsibility,
privacy, reporting and removal limits. Every experiment has a Report action.
Reports enter the private `reports` table; they are never public comments. The
operator should review it routinely and respond to urgent privacy/credential
reports promptly. Never paste report bodies or transcripts into public issues.
The repository's private security-reporting channel is the fallback contact.

## Curate and remove

There is deliberately no admin role system or moderation UI. Use a trusted local
SQLite client against the gallery database, with a backup before maintenance.
List reports by joining `reports.publication` to `publications.id`; inspect only
what is necessary for the report. IDs are opaque; pass them as SQL parameters.

To feature a reviewed public record, update its `featured` flag. To take it down,
update its `status` to `unpublished`. Do not delete/rewrite immutable evidence or
reuse its slug/version. The status gate immediately prevents page, manifest,
record, run-file and social-card reads, and removes discovery listings. Retain
the minimal identity/hash/lineage tombstone. Restrict stored objects and backups
to operators; any later retention/deletion policy must account for reports and
privacy obligations. A cache/CDN introduced later must pass removal checks.

Author unpublish uses the same status gate. Tokens are hashed in SQLite and may
be revoked from the gallery account page; publishing tokens cannot manage accounts
or other authors' content. Provider credentials never belong in this service.
