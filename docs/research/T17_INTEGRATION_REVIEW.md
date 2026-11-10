# T17 independent integration review

**Standards PASS; Spec PASS for bounded deterministic DEVELOPMENT.** ROOT reviewed
and repaired the independent implementation, then qualified the combined UI and
runtime. Live competence, held-out generation, general semantic understanding and
power-loss durability remain unverified. Final current contracts are
DB15/export18/library10/definition2/research-operation2/generation-event-v2.

## Independent specification and observed failures

The review used existing externally authored finite contracts and real public
HTTP/Engine/storage/isolated-worker boundaries. Candidate self-examples were not
the oracle. It froze real-process interruption points before their first outputs:

- After creating a generation origin directory, before publishing its started
  event: startup raised Missing generation attempt origin at896a4e82.
- After writing a request-event temporary file, before atomic replacement:
  restart raised FileExistsError on0001.tmp atcb4dd61c.
- After terminal journal recovery, before operation reconciliation: the next
  restart left the operation in_progress at66d0d57a.

Atomic directory publication, unique temporary event names and idempotent terminal
reconciliation repair those boundaries. Closed event-v2 sequences remain unchanged;
there is no provider retry, historical-format adapter or cross-store atomicity claim.
An unpublished .pending directory has no authority to become a public attempt.

Source tracing corrected an unreachable proposed race before execution: supported
public calls cannot attach an active unscoped generation to study provenance.
The public preservation check instead confirms that pending attachment/scoped
authorization reject without another provider call and do not leak into export.
No manufactured database linkage was used to claim the original scenario.

## Qualification and disposition

At independent backend source7125822b,15 generation/workflow/current-contract cases
passed, including all three process interruptions, explicit failed-artifact/linked
repair histories, per-request receipts, cancellation and unknown-usage ceilings.
The fresh independent5-run/22-turn/22-request oracle passed full serialized inputs,
checkpoint prefixes, cutoffs, private projections, reopen and zero-call replay.
Normal checkpointb9c992db retained those repairs; Ruff/global ty and Gitleaks passed.

Final source667070b7 passes13 affected generation/World/current-contract cases,
including both approved mechanisms, actual-worker consequences, private tool
projections, explicit repair linkage, crash reconciliation and exact replay.
Other source-attributed API/current-contract/static/UI groups are in the
[final verification manifest](FINAL_VERIFICATION.json).

ROOT's actual rendered combined flows cover pending finite inspection and the
explicit author-contract/authorize-generation path, mobile/desktop, both themes
and keyboard use. Fresh production image smoke qualifies real containment,
independent admission, pinned revisions and World restoration/replay. Native
reopening preserves saved data and requires fresh process-local containment
qualification before executable replay. Saving/admission does not sample participants.

The implementer's Browser01 remains a failed recorder assertion with409 unreached;
it is not retrospectively green. ROOT's later observations close the bounded UI
and runtime gate separately. Earlier fixture/setup/hook/cleanup failures remain
historical adverse outcomes in the compact reports. Frozen T01 remains exit1 on
four export-v4 checks; fresh current qualification is not historical parity.

T17 is accepted for its finite deterministic DEVELOPMENT contract. See the
[final product review](FINAL_PRODUCT_REVIEW.md) for measurements, evidence
retirement, final app startup and limits. Retired raw paths are not retained proof.
