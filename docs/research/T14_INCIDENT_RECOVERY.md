# T14 protected-selection incident recovery

Status: in progress, T14 acceptance withheld. ROOT resumed sole tracked writing
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

Next: metadata-only inventory, bounded redaction/restoration proof, current-state
closure review, and explicit acceptance decision. T12/T17 remain on the last
published accepted application frontier; no provisional T14 merge is released.
