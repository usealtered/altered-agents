# ADD Runner Contract

## Purpose

This document defines the exact contract between:

- ADD control plane in this repo.
- Trigger.dev task execution for jobs on `main` and `job-*`.

## Outbound request (control plane -> Trigger.dev API)

- URL: `https://api.trigger.dev/api/v1/tasks/{ADD_TRIGGER_TASK_ID}/trigger` (or `ADD_TRIGGER_API_BASE_URL`)
- Method: `POST`
- Headers:
  - `content-type: application/json`
  - `authorization: Bearer <TRIGGER_SECRET_KEY or ADD_TRIGGER_SECRET_KEY>`

### Body

```json
{
  "payload": {
    "jobId": "string",
    "planId": "string",
    "request": "string",
    "summaryBullets": ["string"],
    "detailBullets": ["string"],
    "branchName": "job-xxxx",
    "repository": "usealtered/altered-agents",
    "syncFrom": "main",
    "callbackUrl": "https://agents.experimental.api.usealtered.com/webhooks/add-runner",
    "callbackSecret": "ADD_RUNNER_CALLBACK_SECRET"
  },
  "options": {
    "idempotencyKey": "add-job-<jobId>",
    "tags": ["add", "agents"]
  }
}
```

### Required behavior

- Must only write to `main` or `job-*` branches.
- Must sync from human `main` before implementation.
- Must avoid touching repositories/resources outside configured allowlist.
- Should include usage/cost metadata in callback when available.

## Callback request (Trigger task -> control plane)

- URL path in API app: `/webhooks/add-runner`
- Method: `POST`
- Headers:
  - `content-type: application/json`
  - `authorization: Bearer <ADD_RUNNER_CALLBACK_SECRET>` (required)

### Body

```json
{
  "jobId": "string",
  "status": "running | completed | failed | blocked | cancelled",
  "errorMessage": "string optional",
  "metadata": {
    "costUsd": 0.1234,
    "commitSha": "string optional",
    "deploymentUrl": "string optional",
    "logs": ["string"],
    "notes": ["string"]
  }
}
```

## Local bypass mode

- Set `ADD_USE_LOCAL_TEST_RUNNER=1`.
- The job will simulate completion without external runner calls.
- Useful for flow testing before real runner deployment.

## Required environment keys

- `ADD_TARGET_GITHUB_REPOSITORY`
- `ADD_ALLOWED_GITHUB_REPOSITORY`
- `ADD_TRIGGER_TASK_ID`
- `ADD_TRIGGER_API_BASE_URL` (optional)
- `TRIGGER_SECRET_KEY` (or `ADD_TRIGGER_SECRET_KEY`)
- `ADD_RUNNER_CALLBACK_URL`
- `ADD_RUNNER_CALLBACK_SECRET`
- `ADD_USE_LOCAL_TEST_RUNNER`

## Safety invariants

- Job target branch must be `main` or start with `job-`.
- Repository must match allowlisted repository.
- Callback without valid bearer secret is rejected.
