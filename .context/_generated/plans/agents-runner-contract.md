# ADD Runner Contract

## Purpose

This document defines the exact HTTP contract between:

- ADD control plane in this repo.
- External runner that executes jobs on `agents/*`.

## Outbound request (control plane -> runner)

- URL: `ADD_CURSOR_RUNNER_WEBHOOK_URL`
- Method: `POST`
- Headers:
  - `content-type: application/json`
  - `authorization: Bearer <ADD_CURSOR_RUNNER_TOKEN>` (optional if configured)

### Body

```json
{
  "jobId": "string",
  "planId": "string",
  "request": "string",
  "summaryBullets": ["string"],
  "detailBullets": ["string"],
  "branchName": "agents/job-xxxx",
  "repository": "usealtered/altered",
  "syncFrom": "main"
}
```

### Required behavior

- Must only write to `agents/*` branches.
- Must sync from human `main` before implementation.
- Must avoid touching repositories/resources outside configured allowlist.
- Should include usage/cost metadata in callback when available.

## Callback request (runner -> control plane)

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
- `ADD_ALLOWED_DOMAIN_SUFFIXES`
- `ADD_CURSOR_RUNNER_WEBHOOK_URL`
- `ADD_CURSOR_RUNNER_TOKEN`
- `ADD_RUNNER_CALLBACK_SECRET`
- `ADD_USE_LOCAL_TEST_RUNNER`

## Safety invariants

- Job target branch must start with `agents/`.
- Repository must match allowlisted repository.
- Runner URL domain must match allowed suffix list when configured.
- Callback without valid bearer secret is rejected.
