# T14 protected-selection incident recovery

Status: targeted redaction complete; independent closure pending, acceptance
withheld. ROOT resumed sole tracked writing
from the reviewer at `08700e9265ca0805d264d98cde83587b8e516e61`.

The independent reviewer passed the bounded product Spec review but failed the
protected-selection protocol in `contract-711`. Three snapshot-producing unit
cases among four baseline cases used the frozen runner without its invocation
wrapper. The whole generated subtree was left opaque. Corrected invocations
passed; they do not undo the earlier capture. The original incident report,
review verdict, outer command/JUnit records, source qualification and failures
remain historical evidence.

ROOT disposition follows the earlier T13 recovery: remove only unintended
generated protected copies and their generated digest entries; retain unaffected
evidence and the failure chronology. This is maintenance of ROOT-owned disposable
test output, not authorization to inspect the original clipboard/configuration,
reset data, or alter application behavior. ROOT now permits metadata-only path
and archive-header enumeration within the exact affected subtree, followed by
minimal sanitized reconstruction. Never read or hash a protected member payload,
copy it elsewhere, or retain an unredacted duplicate. Do not execute inherited
ignored helpers. All unaffected original custody and sealed safe evidence stay
unchanged. No publication until recovery and the acceptance gate are resolved.

Exact affected root:
`.tools/research-harness/evidence/T14-integration/runtime/contract-711/`.
Original clipboard/configuration paths remain outside this operational scope.

Acceptance criteria:

- Freeze a metadata-only inventory and redaction plan before reading allowed
  generated metadata or nonprotected archive members.
- Identify direct and nested copies by names/headers, before member reads.
  Remove their generated digest entries without printing those digest values.
- Independently prove exact content/metadata retention for unaffected members,
  record changed container identities, and leave no unredacted duplicate.
- Re-enumerate the affected outputs and relevant safe capture containers for
  zero prohibited members; do not claim the historical capture never occurred.
- Preserve frozen T01 runner/cases/scores, runtime/build bytes, original custody,
  stash, failure records and every restoration map. Attribute inherited checks
  honestly; repeat only checks that the recovery actually invalidates.
- Obtain a fresh independent closure review of the repaired current state before
  accepting T14. Keep the historical Standards FAIL visible.

ROOT authored and executed a new bounded redactor after freezing the inventory
and header-only plan. It removed six prohibited archive members (77,733 bytes)
from three generated snapshots and twelve generated digest entries from six
source manifests/reports. It never extracted or hashed prohibited member
payloads, computed the tainted containers' whole-file hashes, or made unredacted
backups. The original protected files were never opened, hashed, copied or
modified. Their historical indirect capture remains a failure.

Exact payload and TarInfo/PAX equality was verified for all1,320 unaffected
members. All48 other generated files retain identical hashes, sizes, modes and
integer-nanosecond timestamps. Generated reports retain every non-source field,
including all checks, failed flags, attempts and accounting; only source
identity/redaction metadata changes. The rewritten snapshots have new container
identities and are explicitly labeled redacted, never retrospectively clean.

Proofs under `.tools/research-harness/maintenance/T14-incident-recovery-20261110/`:

- `redaction-plan.json` records the metadata/header-only selection.
- `result.json` records the observed exit0 and all removal/preservation counts.
- `unaffected-members-and-source-proof.json.gz`, SHA256
  `badf64da004360f86e601ff4913258fa72c99e53e7ca888a5eedf85d3477333c`,
  records each unaffected member's identity and exact metadata.
- `root-corroboration.json` re-verifies all823 original safe-index files with
  unchanged hash/size/mode/mtime, the unchanged qualification hash, and zero
  prohibited members in the three redacted snapshots.

No application, runtime/build input or frozen T01 runner/case was changed. Stash
`f771128ba1c9295262a4073df40cc25647b1370f` remains unchanged. No test was weakened,
no original adverse record was removed, and no paid/live/held-out work occurred.
The historical review's Standards FAIL and Spec PASS remain in their original
report and seal. A new closure review must assess current recovery separately.

Next: fresh independent current-state closure review and explicit acceptance
decision. T12 has one renewed offline setup/bounded backend release under the
shared lock; T17's next generation-green remains held until setup releases.
Both remain on the last published accepted application frontier; no provisional
T14 merge is released.
