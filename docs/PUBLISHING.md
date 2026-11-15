# Publish, replay and fork

The local workspace runs experiments. A separate gallery hosts reviewed records,
public reading and GitHub publishing identities. It receives no provider keys and
makes no model calls. App and CLI use the official gallery by default; self-hosters
can override `JAS_GALLERY_URL` or CLI `--gallery`. Browsing sends ordinary request
metadata to the service, never local experiments or provider keys.

## Publish from the app

Gallery opens Browse anonymously. My published contains GitHub sign-in and your
publication controls; general Settings contains no gallery connection form.
Approve the device code in your browser; JAS checks approval automatically. Your publish token is stored by the operating system keychain, never browser
storage or a protocol. Linux needs a working keychain service; JAS reports an
unavailable keychain rather than saving a plaintext token.

Open a finished experiment's Publish tab:

1. Describe the finding, give it a title and up to three tags, choose a featured run
   and public or unlisted visibility. Failed/unattempted runs remain visible;
   active or paused work must be finished before the record can freeze.
2. Review public record scans every included field and replays recorded runs for
   free. Inspect or download the exact record before approving it.
3. Resolve all scanner findings. Correct editable metadata and scan again.
   A demonstrably synthetic email address may be reviewed with a reason. Genuine
   credentials, local paths and hidden model reasoning cannot be waived. A leak
   in immutable evidence requires a clean new version/run; the original stays local.
4. Explicitly acknowledge the record, including agent-private observations, and
   publish. A changed record requires review again.

The record includes the selected frozen protocol, prompts, agent outputs,
observations, typed events, checkpoints, metrics and costs. It excludes Assistant
conversations, discarded versions, provider configuration and raw provider traces.
Agent-private evidence becomes readable by anyone with the link after publication.
The scanner is a safeguard, not a substitute for reviewing the material.

All runs are independently checked by the gallery using trusted installed rules.
The badge means recorded actions reproduced recorded states with zero model calls.
It does not attest uploaded model identity, research validity or future behavior.
Recorded external judgments are replayed as fixed inputs, not rejudged. Failed or
unsupported checks allow publication without the badge and explain the reason.

Unlisted is the default: absent from discovery and marked noindex, accessible to
anyone with the link. Every published version is immutable. Publishing again
creates a new version. My published lets the author unpublish; pages, downloads,
run files and social cards then stop being served. Already downloaded copies and
third-party caches cannot be recalled. Revoke device tokens on the gallery account
page. Local sign-out removes only that machine's token.

## CLI

Run these commands while the local server is stopped if they access its database.
Use `--workspace` before the subcommand to select the same workspace explicitly.

```sh
jas check protocol.json
jas run protocol.json --max-usd 2 --output result.json
jas replay result.json
jas login
jas publish result.json --reviewed
jas fork author/name
```

`check` is free. `run` prints the estimate before execution and requires the stated
maximum; workspace and experiment caps also apply. Add `--max-tokens` for unpriced
models. Provider calls never silently retry or substitute a different model.
`replay` makes zero calls and exits unsuccessfully for failed verification.
`publish` scans again and requires explicit review. Edit the public-ready record's
description before publishing; do not change immutable protocol/run evidence.

Fork downloads the exact protocol, records its source version/hash, and creates a
new local experiment without calling a model or installing executable code.
`jas fork author/name/v3` pins a particular publication. The public page supplies
this pinned command, full record download and citation. Scripted starters are
labelled demonstrations, not live-model findings.

## Public record compatibility

`jas-public` version 1 is separate from the one-current internal workspace schema.
The canonical JSON record has a SHA-256, with a manifest/index and compressed
per-run files so reading a page loads only the selected recording. Derived chart
summaries are checked against the recordings, including planned missing/failed
runs, seed/repetition pairing and the declared headline outcome.

Public links must remain readable after an internal schema update. Before changing
public format or rule semantics, retain the old viewer and trusted verifier,
including the domain/rule dependencies needed to load the old protocol; test
archived fixtures under the retained path. Never reinterpret an old record using
new rules or execute code supplied by an upload. Unsupported rule versions retain
their evidence and explicit unverified reason. The current implementation supports
public v1/current trusted rules; future compatibility is a release obligation,
not a claim that future versions already exist.

A public gallery uses private immutable object storage. Every outward read checks
publication status, and current page/file responses are no-store to make removal
immediate. Static application assets may be cached. An operator adding CDN object
caching must keep it behind this status gate and verify purge behavior before
launch; never make the underlying bucket directly public.
