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

**Setup requires two repository secrets** (see instructions below).

---

### Claude Issue Triage — `claude-issue-triage.yml`

Uses the official Anthropic workflow action [`anthropics/claude-code-action@v1`](https://github.com/anthropics/claude-code-action) to automatically analyze every new issue with Claude AI. When an issue is opened, Claude will:

- Read the project README and explore the codebase for context
- Classify the issue (bug / feature request / question / other)
- Assess priority (critical / high / medium / low) and feasibility
- Suggest a high-level implementation plan with affected files
- Check for similar existing issues
- Post the full triage analysis as a comment on the issue
- Send the analysis summary to your Telegram bot

> **No API key required!** This action officially supports authentication with a Claude Max subscription — no need to pay for API credits separately.

**Setup requires three repository secrets:** `TELEGRAM_CHAT_ID`, `TELEGRAM_TOKEN` (same as Telegram Notifications above), and `CLAUDE_CODE_OAUTH_TOKEN` (see setup below).

## Setting Up Claude Code OAuth Token

1. Make sure Claude Code is up to date:
   ```bash
   claude update
   ```
2. Run the token setup command:
   ```bash
   claude setup-token
   ```
3. Authenticate with your Claude account in the browser
4. Copy the token that is displayed
5. In your repository, go to **Settings** → **Secrets and variables** → **Actions**
6. Click **New repository secret**, name it `CLAUDE_CODE_OAUTH_TOKEN`, and paste the token

> **Note:** This token works with a Claude Max subscription. You do not need a separate Anthropic API key.

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
name: Telegram / Stale Issues / Claude Triage

on:
  issues:
    types: [opened, labeled, closed]
  pull_request:
    types: [opened]
  issue_comment:
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

  claude-issue-triage:
    if: github.event_name == 'issues' && github.event.action == 'opened'
    permissions:
      contents: read
      issues: write
      id-token: write
    uses: IliyaBrook/GitHub_workflows/.github/workflows/claude-issue-triage.yml@master
    secrets: inherit
```

The `secrets: inherit` directive passes your repository secrets to the called workflows automatically.

> **Important:** You still need to add the required secrets (`TELEGRAM_CHAT_ID`, `TELEGRAM_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN`) to **each repository** that uses these workflows. `secrets: inherit` forwards secrets from your repo to the reusable workflow — it does not pull them from this repository.

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