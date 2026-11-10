# Fresh current-contract DEVELOPMENT oracle v1

Authored before this matrix's outputs from the unchanged committed T01 cases,
accepted World rules and reviewed price/reservation contract. This is fresh
qualification after historical evidence retirement, not comparison with deleted
records. Original runner/cases/scores remain unchanged; no BEFORE is reconstructed.

| Case/arm | Actor order | Exact choices | Terminal balances by actor | Turns/requests |
| --- | --- | --- | --- | --- |
| simple-binding-split | b,a | b offers5, a accepts | a5,b9 | 2 |
| three-signal-disclosure private | b,a,c | each chooses0 | a7,b7,c7 | 3 |
| three-signal-disclosure shared | b,a,c | each chooses0 | a7,b7,c7 | 3 |
| four-feasible-promises | d,a,c,b; a,c,d,b | first round each2/promise3; second a0, c/d/b3 | a18.5,b15.5,c15.5,d15.5 | 8 |
| six-token-permissions | a,d,c,b,e,f | a allocates4 to b; each worker works | a8,b6,c2,d2,e2,f2 | 6 |

Five runs,22 turns and22 direct participant requests. Every response is100 input/
50 output tokens,35 integer microdollars; per-run charges70,105,105,280,210;
aggregate770, input2200/output1100. Actual provider spending0. Each in-flight
request's reserved charge is checked through the real public API: with n UTF-8
bytes in complete prompt + instructions + JSON schema, reserved microdollars are
ceil((n+4096)/8)+256. This is the integer form of the reviewed Luna input rate,
25% input margin and512-output-token allowance, independently of candidate float
arithmetic. Pending workspace/study charges equal35 times prior settlements plus
this reservation; after response they equal35 times completed requests. No unknown
usage or retry is expected in this matrix; separate failure witnesses cover those.

Actor signals, fixed from the committed seeded rules using standalone stdlib RNG
before any app output (receipt `literal-seed-authoring`), are: bargaining a3/b8;
information actual binary signals all0 (synthetic checkpoint signals a3/b5/c4);
commons round1 a6/b4/c1/d3, round2 a1/b5/c6/d3; institution a12/b6/c0/d0/e5/f2.
All role labels are Authority; only institution a has actual allocation permission.

Full bounded inputs are independently expanded from literal rule text, profiles,
signals, legal options and fixed event/history tables. Compare every observation
field and full serialized request, not selected counters or an input hash produced
by the candidate. Inspect schema alternatives/required payload/amount and recipient
bounds; verify complete recorded prompt/instructions/schema/settings, actor/cutoff,
response/action and per-request ledger against those fixed expectations. Sealed
commons choices remain absent until settlement. Private information inputs contain
no other signal/truth; shared inputs contain exactly a0/b0/c0. No role grants tools.

Check each prefix's whole checkpoint against independently expanded literal state,
append-only evidence, recorded consequences and hashes; reopen persisted data and
replay every run with zero calls/unchanged usage. Cutoff exposure cannot cite later
requests/events. Completed commons balances are8 each after round1; one eligible
breach by a at round2 is distinct from intent. Institution shared output is0,2,4,6,8,10.
No analyst output, outcome policy, live competence or held-out claim follows.

The unchanged frozen runner is a separate CURRENT-source execution. Retain its
actual exit, all check booleans, every failure and whether the historically
recorded four export-v4 failures recur. No comparator needing retired BEFORE runs.
Each bounded job carries protected-excluded tracked source identity and raw logs.
