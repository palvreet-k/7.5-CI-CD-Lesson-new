# 7.5 – CI/CD with GitHub Actions

## What is CI/CD?

**CI (Continuous Integration)** means every time you push code to GitHub, automated checks run immediately — tests, build verification. The goal: catch broken code before it ever reaches production.

**CD (Continuous Deployment)** takes it further. Once CI passes, the code is automatically deployed. No manual steps.

Together, CI/CD turns this:

```
write code → manually test → manually deploy → pray 🤞
```

Into this:

```
push code → tests run automatically → deploy automatically ✅
```

---

## Why Does It Matter? (Real Scenarios)

### "It worked on my machine"
Developer manually deploys to the server. Three hours later users report it's broken — their local Node version was different from the server's.

With CI/CD: the pipeline runs on a clean, controlled environment every single time.

### "Deploy on a Friday"
Team manually deploys at 4:45pm Friday. Something breaks. Everyone scrambles.

With CI/CD: deploys are automatic and fast. Bad code is caught by tests before it ever goes out.

### "Who broke the build?"
10 developers pushing code all day. Someone merges a broken route. Nobody notices for two days.

With CI/CD: the moment bad code is pushed, the pipeline fails and nothing deploys. The broken commit is immediately obvious.

---

## A Typical CI/CD Pipeline

```
Developer pushes to GitHub
        ↓
GitHub Actions triggers a workflow
        ↓
  ┌──────────────────────────┐
  │  CI Stage                │
  │  1. Install dependencies │
  │  2. Run tests       ✅   │  ← pipeline stops here if tests fail
  └──────────────────────────┘
        ↓ (only if tests pass)
  ┌──────────────────────────┐
  │  CD Stage                │
  │  3. Deploy to Render     │
  └──────────────────────────┘
        ↓
  API is live 🚀
```

**Tests are the core of CI.** If they fail, nothing deploys. Broken code never reaches your users.

---

## Popular CI/CD Tools

| Tool | Notes |
|------|-------|
| **GitHub Actions** | Built into GitHub, free for public repos — what we're using |
| GitLab CI/CD | Built into GitLab, similar YAML syntax |
| CircleCI | Third-party, popular for speed |
| Travis CI | One of the originals |
| Jenkins | Open source, self-hosted, very configurable |
| Atlassian Bamboo | Enterprise, pairs with Jira |

AWS CodePipeline, Google Cloud Build, and Azure DevOps also exist. Same concepts, different YAML.

---

## GitHub Actions: Key Concepts

### Workflow
A YAML file in `.github/workflows/`. Defines what to do and when. A repo can have multiple workflows.

### Trigger (`on`)
What causes the workflow to run.

```yaml
on:
  push:
    branches: [main]        # runs on every push to main

  pull_request:
    branches: [main]        # runs when a PR targets main

  workflow_dispatch:        # allows manual trigger from GitHub UI
```

### Job
A set of steps that run on the same machine. Jobs can run in parallel or depend on each other.

### Step
A single unit of work — either a shell command (`run`) or a pre-built action (`uses`).

### Runner
The fresh virtual machine GitHub spins up for each run. Starts completely clean every time — nothing carries over between runs. Options: `ubuntu-latest`, `windows-latest`, `macos-latest`.

### Action
A reusable pre-built step from the GitHub Marketplace:
- `actions/checkout@v4` — clones your repo onto the runner
- `actions/setup-node@v4` — installs a specific Node version

---

## Anatomy of a Workflow File

```yaml
name: Test and Deploy           # shown in the Actions tab

on:
  push:
    branches:
      - main

jobs:
  deploy:                       # job name (you choose this)
    runs-on: ubuntu-latest      # fresh Ubuntu VM for each run

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run tests          # ← CI: pipeline stops here if tests fail
        run: npm test

      - name: Deploy to Render   # ← CD: only runs if tests pass
        run: curl "${{ secrets.RENDER_DEPLOY_HOOK }}"
```

Every `run` is a shell command. Every `uses` pulls in a pre-built action. Steps run top to bottom — if any step fails, everything after it is skipped.

---

## `run` vs `uses` — What's the difference?

**`run`** is just a shell command. Anything you'd type in a terminal:
```yaml
run: npm install
run: npm test
run: curl "https://..."
```

**`uses`** pulls in a pre-built, reusable action — code someone else wrote and published so you don't have to. Instead of writing 20 shell commands to install Node correctly across different operating systems, someone already packaged that up:
```yaml
uses: actions/setup-node@v4
with:
  node-version: '20'
```

The `@v4` is just the version tag — same idea as `npm install express@4`.

### Who writes these actions and where do you find them?

Actions live on GitHub as regular repos. `actions/checkout@v4` is literally **github.com/actions/checkout** — you can go read the source code right now. The `actions/` ones are written and maintained by GitHub themselves.

But anyone can publish an action. The official marketplace is:

**[marketplace.github.com/actions](https://github.com/marketplace?type=actions)**

Search for anything — "deploy to S3", "send Slack notification", "set up Python" — and you'll find documented, community-built actions ready to drop into your workflow.

### If you've done Docker, you already know this shape

The runner starts as a completely blank machine — no files, no Node, nothing. The workflow builds it up step by step, which maps directly to what you've seen in Docker:

| Docker | GitHub Actions |
|--------|----------------|
| `FROM ubuntu` | `runs-on: ubuntu-latest` |
| `COPY . .` | `uses: actions/checkout@v4` |
| `RUN npm install` | `run: npm install` |
| `CMD node server.js` | `run: node server.js` |

`actions/checkout` is doing exactly what `COPY . .` does — the runner has no idea what your project is until you clone it onto the machine.

---

## Connecting GitHub Actions to Render

Render gives you a **Deploy Hook** — a unique URL. When GitHub Actions hits it, Render pulls your latest code and redeploys.

### Setup

1. Render → your web service → **Settings** → **Deploy Hook** → copy the URL
2. GitHub → your repo → **Settings** → **Secrets and Variables** → **Actions** → **New repository secret**
   - Name: `RENDER_DEPLOY_HOOK`
   - Value: the URL from Render
3. Reference it in your workflow as `${{ secrets.RENDER_DEPLOY_HOOK }}`

Secrets are **never visible in logs** — GitHub masks them automatically with `***`.

---

## Secrets and Environment Variables

| | Secrets | Variables |
|--|---------|-----------|
| Sensitive? | Yes — API keys, tokens, passwords | Not necessarily |
| Visible in logs? | Never (masked) | Yes |
| Set in | GitHub → Settings → Secrets | GitHub → Settings → Variables or `env:` in YAML |
| Access syntax | `${{ secrets.MY_SECRET }}` | `${{ vars.MY_VAR }}` |

**Rule of thumb:** anything you wouldn't commit to your repo goes in a secret.

### What happens if you expose a secret?

If you accidentally commit an API key or token to a public repo:

1. GitHub scans commits and may alert you
2. But bots are scanning public repos in real time — damage may already be done
3. You must **immediately rotate the key** (revoke it, generate a new one)
4. Assume it was compromised the moment it was public

This is why `.env` is always in `.gitignore`. Always.

---

## What a Failing Pipeline Looks Like

When a test fails, GitHub Actions marks the run ❌ and stops immediately. The Deploy step never runs. The Actions tab shows exactly which step failed — expand the logs and you see the same Mocha output you'd see locally.

The failure is loud, immediate, and blocks the deploy. That's CI working exactly as intended.
