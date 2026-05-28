# ADD Feature Testing Playbook

Use this for each iMessage-driven feature run.

## 1) Send request in this shape

Copy-paste and fill:

```text
Feature: <name>
Complexity: easy|medium|hard
Goal: <one sentence outcome>
Acceptance criteria:
- <criterion 1>
- <criterion 2>
- <criterion 3>
Constraints:
- Keep to one feature scope.
- Use existing architecture and conventions.
- Run pnpm check before completion.
Deliverable:
- Commit to a job-* branch and report summary + risks.
```

## 2) During run: quick checks

- Ask iMessage `run status` every 2-5 minutes.
- Capture:
  - Job ID
  - Branch
  - Cursor run URL

## 3) After run: inspect results

Run one of:

```bash
pnpm agents:inspect -- --job <jobId>
pnpm agents:inspect -- --thread <threadId>
```

Then review:

- `status` terminal and non-null `completedAt`.
- `commitSha` present.
- `notes` and `errorMessage` are coherent.
- `cursorRunStatus` is `FINISHED` (or clear failure reason).

## 4) Scorecard (0-2 each)

- Reliability:
  - 0 failed/aborted, 1 partial/manual rescue, 2 clean completion.
- Correctness:
  - 0 misses core intent, 1 partially meets, 2 meets acceptance criteria.
- Quality:
  - 0 messy/regressive, 1 mixed, 2 clean and aligned with conventions.
- Efficiency:
  - 0 excessive looping, 1 acceptable, 2 concise execution.
- Observability:
  - 0 poor metadata, 1 partial, 2 complete metadata and traceability.

Total: `/10`.

## 5) Escalation rule

If score is `<7` or same failure repeats twice:

- stop new feature runs,
- fix runner/system prompt/tooling issue first,
- rerun with an easy feature before continuing.
