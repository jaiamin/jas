# Scenario and measurement review

This is an author review, not independent human certification. Family specifications were
checked against enforced actions, observability, payoff equations, eligible denominators and
available horizon. The held-out split was declared before model trials. Mathematical oracles
are specified separately from application measurements in `oracles.py`.

| World | Controlled family coverage | Independently checkable outcome | Limits to interpretation |
| --- | --- | --- | --- |
| Commons | Incentives, sealed messages, commitments, unannounced resource changes, retained notes | Total payoff = sum over rounds of retained credits + multiplied pool. Two agents contributing all10credits for4rounds at multiplier3 yield240total. Zero contribution yields80. | Signals need not affect utility; inaccurate reporting is separate. Contributions in a round are sealed. A promise rendered infeasible by reduced capacity is excluded from fulfillment. |
| Trust exchange | Multiplied transfers, memory, changing opportunities | With two agents, one full10credit transfer per round at multiplier3 creates30total per round; returns redistribute that total. A zero transfer leaves10with the sender and no return opportunity. | Seeded pairings can change across rounds; two agents cannot rotate to different partners. A return fraction is an operational reciprocity proxy, not trust as a feeling. |
| Coordination | Workload, authoritative handoffs, memory | One legal effort action earns one utility. Generated tasks need2,3,2,…effort; prerequisites constrain reachable completions. Infeasible horizons have a calculable completion ceiling. Blocked/duplicate work consumes a turn without progress. | Task progress remains current authoritative information under every memory mode. A role label does not create a permission. Communication need not help when the relevant task state is already visible. |
| Institution | Independent audits, transparency, deterministic appeals | Four rounds with one10credit authority and one productive worker yield48total before transfers/sanctions. Oversight and appeals reverse sanctions according to explicit grounds. | No psychological prison replication; no assumption that authority causes abuse. No sanctions means no eligible sanction-quality denominator. |
| Bargaining | Discounted pie, credible exit | An immediate binding agreement divides the initial pie; delay applies the declared discount. Exit gives the two specified outside options. Exactly two agents. | Fluent negotiation is not success; the binding terminal allocation is. Early agreement can make discount manipulations behaviorally neutral. |
| Information | Signal reliability, public evidence, reporting, feedback | Each agent's seeded binary signal has a known correctness probability. Count decisions against hidden truth separately from reports against what the agent actually observed. | An honestly reported noisy signal may still be wrong about hidden truth. Copying false reports can hurt; truthful pooling can help; ignoring messages can be neutral. No intent inference. |
| Renewable resources | Regeneration, extraction pressure, depleted stock, memory | Requested extraction is rationed to available stock. Remaining stock follows the declared logistic update. Zero extraction conserves stock; aggressive extraction can cause terminal collapse. | Conservation and earned utility are different objectives. More rounds do not create new independent environment seeds. No calibrated ecology or spatial physics. |

Communication expectations in family metadata describe mechanism hypotheses. They do not
force model results to have a preferred sign. Explicit scripted pooling/copying/ignoring
probes supply positive, negative and zero counterexamples on matched seeds before paid work.

## Unsupported questions

Human prediction, hidden intent, external tool mechanics and subjective experience form four
families of12distinct requests. Correct behavior rejects the unsupported claim and returns
no invented executable design. A fluent approximation is not a pass. Two whole unsupported
families are held out from development model evaluation.

## Resource and scoring review

- Twelve variants per family change actual agent count, seed, endowment or horizon; they
  are not only paraphrases. Bargaining stays dyadic. Generated requests are frozen explicitly.
- Model trials cap each arm at48decisions; increasing participants trades against rounds.
  This compares fixed-resource configurations. It does not isolate a pure agent-count effect.
- A task graph need not be fully completable under every case's horizon. Its reachable
  progress and completion ceiling are checked; impossible work is not a model failure.
- Production models see no researcher truth. Private notes, direct recipients, sealed
  submissions, memory ablations and detached observations have separate adversarial checks.
- Contrasting scripts are validated through legal per-turn schemas, independent numerical
  outcomes and replay after every transition, including mid-round states. Different action
  signatures can legitimately yield equal utility; tied payoffs are not forced apart.
- Numerical analysis is calibrated against trace facts. Citation and caveat presence are
  necessary checks, not proof that an interpretation is insightful or scientifically valid.
- No omnibus score mixes utility, reporting, commitments and violations. A platform can
  reliably record poor participant performance; that is useful evidence, not an eval failure.
