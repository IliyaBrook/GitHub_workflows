# OpenClaw GitHub Responder

Use these workflows when you want an OpenClaw assistant on your own server to answer GitHub Issues and Discussions without exposing an inbound HTTP port.

The flow is event-driven:

1. GitHub starts a workflow when an issue, issue comment, discussion, or discussion comment is created.
2. The workflow runs on your self-hosted runner.
3. The runner calls a local OpenClaw hook, usually `http://127.0.0.1:18789/hooks/agent`.
4. OpenClaw reads the checked-out repository and posts a public reply when a code-aware answer is useful.

The responder is designed for public support. It is read-only by prompt: it should answer questions, explain code, and propose implementation plans, but it should not edit files, push commits, create PRs, change settings, or restart services.

## Files

- [`../.github/workflows/openclaw-discussion-responder.yml`](../.github/workflows/openclaw-discussion-responder.yml) - reusable workflow for Discussions.
- [`../.github/workflows/openclaw-issue-responder.yml`](../.github/workflows/openclaw-issue-responder.yml) - reusable workflow for Issues.
- [`../openclaw/openclaw-github-responder`](../openclaw/openclaw-github-responder) - server-side wrapper to install on the self-hosted runner host.

## Server Setup

The runner host needs:

- `curl` and `jq` for the wrapper.
- `gh` authenticated as the assistant GitHub account for posting replies.
- OpenClaw Gateway running with hooks enabled.

Install the wrapper on the same host where OpenClaw Gateway runs:

```bash
sudo install -m 755 openclaw/openclaw-github-responder /opt/openclaw/bin/openclaw-github-responder
```

Enable OpenClaw hooks with a dedicated token. Example config shape:

```json5
{
  hooks: {
    enabled: true,
    path: "/hooks",
    token: "use-a-dedicated-random-token",
    defaultSessionKey: "hook:github:responder",
    allowRequestSessionKey: false
  }
}
```

Store the same token on the runner host:

```bash
sudo install -m 700 -d /opt/openclaw/secrets
printf '%s' 'use-a-dedicated-random-token' | sudo tee /opt/openclaw/secrets/github-hook-token >/dev/null
sudo chown -R "$USER:$USER" /opt/openclaw/secrets
sudo chmod 600 /opt/openclaw/secrets/github-hook-token
```

The token file must be readable by the OS user that runs the self-hosted runner.
If the runner service runs as `github-runner`, use that user instead of `$USER`
in the `chown` command.

Restart OpenClaw Gateway if your config system requires it.

## Runner Requirements

Each repository that calls these workflows must have access to a self-hosted runner with the labels you configure in `runner-labels`.

For personal GitHub repositories, a runner is normally registered per repository. For many repositories, consider a GitHub Organization and an org-level runner. You do not need to open inbound ports; the runner connects outbound to GitHub.

The assistant GitHub account must be able to read the repository and comment on Issues/Discussions. For private repositories, add that account as a collaborator.

## Caller Workflow

Create `.github/workflows/openclaw-responder.yml` in the target repository:

```yaml
name: OpenClaw Responder

on:
  issues:
    types: [opened]
  issue_comment:
    types: [created]
  discussion:
    types: [created]
  discussion_comment:
    types: [created]

jobs:
  # No GitHub secrets are required for the OpenClaw responder jobs.
  # These `with:` values are inputs passed to the reusable workflow; the reusable
  # workflow turns them into OPENCLAW_* environment variables for the wrapper.
  issue-responder:
    if: github.event_name == 'issues' || github.event_name == 'issue_comment'
    permissions:
      contents: read
      issues: read
    uses: IliyaBrook/GitHub_workflows/.github/workflows/openclaw-issue-responder.yml@master
    with:
      runner-labels: '["self-hosted","openclaw"]'
      responder-script: /opt/openclaw/bin/openclaw-github-responder
      bot-login: brooks-assistant
      assistant-name: Developer Assistant
      hook-url: http://127.0.0.1:18789/hooks/agent
      hook-token-file: /opt/openclaw/secrets/github-hook-token

  discussion-responder:
    if: github.event_name == 'discussion' || github.event_name == 'discussion_comment'
    permissions:
      contents: read
      discussions: read
    uses: IliyaBrook/GitHub_workflows/.github/workflows/openclaw-discussion-responder.yml@master
    with:
      runner-labels: '["self-hosted","openclaw"]'
      responder-script: /opt/openclaw/bin/openclaw-github-responder
      bot-login: brooks-assistant
      assistant-name: Developer Assistant
      hook-url: http://127.0.0.1:18789/hooks/agent
      hook-token-file: /opt/openclaw/secrets/github-hook-token
```

## Inputs

| Input | Default | Description |
|---|---|---|
| `runner-labels` | `["self-hosted","openclaw"]` | JSON array for `runs-on`. Add host-specific labels if needed. |
| `responder-script` | `/opt/openclaw/bin/openclaw-github-responder` | Absolute path to the wrapper on the runner host. |
| `bot-login` | `brooks-assistant` | GitHub login of the assistant bot. Events from this actor are skipped. |
| `assistant-name` | `Developer Assistant` | Public assistant name included in the prompt. |
| `hook-url` | `http://127.0.0.1:18789/hooks/agent` | OpenClaw hook endpoint reachable from the runner host. |
| `hook-token-file` | `/opt/openclaw/secrets/github-hook-token` | File containing the hook token. |
| `approved-actor-logins` | `IliyaBrook` | Comma-separated GitHub logins allowed to approve code-changing runs. |
| `staging-update-command` | empty | Optional command to run after a successful approved code change. |
| `timeout-minutes` | `60` | Maximum workflow job runtime. |

## Wrapper Environment

The wrapper also accepts environment variables:

| Variable | Description |
|---|---|
| `OPENCLAW_HOOK_URL` | Overrides the hook URL. |
| `OPENCLAW_HOOK_TOKEN` | Hook token value. Prefer `OPENCLAW_HOOK_TOKEN_FILE` on shared hosts. |
| `OPENCLAW_HOOK_TOKEN_FILE` | File containing the hook token. |
| `OPENCLAW_BOT_LOGIN` | GitHub login to suppress, usually your assistant account. |
| `OPENCLAW_ASSISTANT_NAME` | Public assistant name. |
| `OPENCLAW_OWNER_LABEL` | Public wording for who approves code changes, for example `project maintainer`. |
| `OPENCLAW_APPROVED_ACTOR_LOGINS` | Comma-separated GitHub logins allowed to approve code-changing runs. |
| `OPENCLAW_APPROVAL_PHRASE_REGEX` | Case-insensitive regex that marks a comment from an approved actor as approval. |
| `OPENCLAW_STAGING_UPDATE_COMMAND` | Command the assistant should run after committing and pushing an approved change to the default branch. |

## Behavior

- The assistant replies in the same language as the incoming message when the language is clear.
- Public replies should be understandable to non-programmers by default. Unless someone explicitly asks for code-level detail, the assistant should avoid internal variable names, boolean conditions, function names, and implementation jargon, and describe the visible behavior, user impact, and result in plain language.
- It checks the internet when current external facts are needed, preferring official sources for technical claims.
- It ignores spam, greetings, pure thanks, unrelated messages, and messages where no answer is useful.
- It does not implement code changes from Issues or Discussions by default. It may explain a plan and say changes need maintainer approval.
- It enters approved-change mode only for issue comments from `approved-actor-logins` that contain an explicit approval phrase such as `approved`, `приступай`, `разрешаю`, or `утверждаю`.
- In approved-change mode, it must read the full thread first, make only the approved change, commit and push to the default branch when allowed, create a branch and PR if the default branch push is rejected, update staging when the configured command can deploy the pushed change, and report the result back to GitHub.
- For user-facing web, mobile, or Expo changes in approved-change mode, build success is not enough: after staging is updated, it must open staging in a browser with a mobile viewport such as `390x844`, navigate to the issue-provided URL or affected route, perform the actual user action, and report the visible verification result. If browser access, login, test data, or a required device is unavailable, it must say so instead of claiming full verification.
- It skips events created by `bot-login` to avoid loops.

## Telegram Notifications

Telegram notification workflows are separate from the OpenClaw responder. If you also want Telegram notifications, configure `TELEGRAM_TOKEN` and `TELEGRAM_CHAT_ID` and use [`telegram-notify.yml`](../.github/workflows/telegram-notify.yml) or [`global-workflows.yml`](../global-workflows.yml).
