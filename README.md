# GitHub Workflows Cheat Sheet

A collection of ready-to-use GitHub Actions workflows. Copy what you need into your project's `.github/workflows/` directory and customize to fit your setup.

## Workflows

### Stale Issues & PRs — `stale-issues.yml`

Automatically marks issues and pull requests as stale after a period of inactivity and closes them if no further activity occurs.

**Defaults:**
- Issues are marked stale after **30 days**, closed after **7 more days**
- PRs are marked stale after **30 days**, closed after **14 more days**
- Issues labeled `bug`, `enhancement`, or `pinned` are exempt
- Runs daily at 09:00 UTC (can also be triggered manually)

**Setup:** No additional configuration needed — just copy the file and adjust the timings if desired.

---

### Telegram Notifications — `telegram-notify.yml`

Sends real-time Telegram messages when activity happens in your repository:

- New issue opened
- Issue marked as stale
- Issue closed
- New pull request opened
- New comment on an issue
- New discussion opened
- New comment on a discussion

**Setup requires two repository secrets** (see instructions below).

---

### OpenClaw GitHub Responder — `openclaw-issue-responder.yml` / `openclaw-discussion-responder.yml`

Uses a self-hosted runner on your OpenClaw server to wake a local OpenClaw assistant when Issues or Discussions need a code-aware public reply.

- No inbound public port is required; the self-hosted runner connects outbound to GitHub.
- The assistant reads the checked-out repository and replies in Issues when useful.
- Discussion events are ignored unless the incoming discussion body or discussion comment body mentions `@brooks-assistant`.
- The provided wrappers are read-only for public/non-approved actors. For Issues, Issue comments, Discussions, and Discussion comments from configured project authors, they may manage Issues. Code changes still require an explicit approval phrase in an Issue comment from a configured project author.
- Includes server-side wrapper scripts in [`openclaw/`](openclaw/).

**Setup:** see [OpenClaw GitHub Responder](docs/openclaw-responder.md).

## Setting Up Telegram Notifications

### Step 1 — Get your Telegram Chat ID

1. Open [@userinfobot](https://telegram.me/userinfobot) in Telegram
2. Press **Start**
3. Open the bot menu and tap **Get ID**
4. Copy the numeric ID — this is your `TELEGRAM_CHAT_ID`

> **Tip:** If you want notifications sent to a group chat instead of a personal DM, add the bot to the group and use the group's chat ID (it will be a negative number). You can get it by adding [@userinfobot](https://telegram.me/userinfobot) to the group temporarily.

### Step 2 — Create a Telegram Bot

1. Open [@BotFather](https://telegram.me/BotFather) in Telegram
2. Send `/newbot` and follow the prompts to name your bot
3. Once created, BotFather will show your new bot — click **Open**
4. Click the **Copy** button at the top to copy the bot token
5. This is your `TELEGRAM_TOKEN`

> **Important:** If you're sending notifications to a personal chat, make sure to start a conversation with your new bot first (press **Start**) — otherwise the bot won't be able to message you.

### Step 3 — Add Secrets to Your Repository

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add:

| Secret Name | Value |
|---|---|
| `TELEGRAM_CHAT_ID` | Your numeric chat ID from Step 1 |
| `TELEGRAM_TOKEN` | The bot token from Step 2 |

4. Copy `telegram-notify.yml` into your project's `.github/workflows/` directory
5. Push to your repository — you're all set!

## Usage

There are two ways to use these workflows in your project:

### Option 1 — Reusable workflows (recommended)

All workflows in this repository support [`workflow_call`](https://docs.github.com/en/actions/sharing-automations/reusing-workflows), which means you don't need to copy each workflow file individually. Instead, copy a single caller file into your project and reference the workflows directly from this repository.

1. Copy `global-workflows.yml` into your project's `.github/workflows/` directory
2. That's it — your project will use the workflows hosted in this repository

```yaml
# .github/workflows/global-workflows.yml
name: Telegram / Stale Issues / OpenClaw

on:
  issues:
    types: [opened, labeled, closed]
  pull_request:
    types: [opened]
  issue_comment:
    types: [created]
  discussion:
    types: [created]
  discussion_comment:
    types: [created]
  schedule:
    - cron: '0 9 * * *'
  workflow_dispatch:

jobs:
  telegram-notifications:
    if: github.event_name != 'schedule' && github.event_name != 'workflow_dispatch'
    uses: IliyaBrook/GitHub_workflows/.github/workflows/telegram-notify.yml@master
    secrets: inherit

  stale-issues:
    if: github.event_name == 'schedule' || github.event_name == 'workflow_dispatch'
    permissions:
      issues: write
      pull-requests: write
    uses: IliyaBrook/GitHub_workflows/.github/workflows/stale-issues.yml@master
    secrets: inherit

  openclaw-issue-responder:
    if: github.event_name == 'issues' || github.event_name == 'issue_comment'
    permissions:
      contents: read
      issues: write
    uses: IliyaBrook/GitHub_workflows/.github/workflows/openclaw-issue-responder.yml@master
    with:
      responder-script: /opt/openclaw/bin/openclaw-github-issue-responder

  openclaw-discussion-responder:
    if: github.event_name == 'discussion' || github.event_name == 'discussion_comment'
    permissions:
      contents: read
      discussions: write
    uses: IliyaBrook/GitHub_workflows/.github/workflows/openclaw-discussion-responder.yml@master
    with:
      responder-script: /opt/openclaw/bin/openclaw-github-discussion-responder
```

The `secrets: inherit` directive passes your repository secrets to the called workflows automatically.

> **Important:** You still need to add the required Telegram secrets (`TELEGRAM_CHAT_ID`, `TELEGRAM_TOKEN`) to **each repository** that uses Telegram notifications. `secrets: inherit` forwards secrets from your repo to the reusable workflow — it does not pull them from this repository.

**Benefits of this approach:**
- You only maintain one small file in your project
- When workflows are updated in this repository, your project picks up the changes automatically
- No need to keep workflow copies in sync across multiple repositories

### Option 2 — Copy workflow files directly

If you prefer full control over the workflow logic, copy the individual `.yml` files from `.github/workflows/` into your own project and modify them as needed.

```bash
# Copy a specific workflow into your project
cp <path-to-this-repo>/.github/workflows/telegram-notify.yml <your-project>/.github/workflows/
```

### Option 3 — Fork and self-host

If you want to use reusable workflows but host them yourself:

1. Fork this repository (or create your own and copy the workflow files)
2. In your caller workflow, update the `uses` paths to point to your repository:

```yaml
# Change this:
uses: IliyaBrook/GitHub_workflows/.github/workflows/telegram-notify.yml@master
# To this:
uses: <your-username>/<your-repo>/.github/workflows/telegram-notify.yml@master
```

## Contributing

Found a useful workflow pattern? Feel free to open a PR and add it to the collection.
