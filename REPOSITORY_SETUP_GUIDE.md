# StockPilot GitHub Repository Setup Guide

## 1. Create the repository
Use one GitHub monorepo for the whole system. Name it according to the university/group convention, for example `SE3090_GXX_StockPilot`. Keep it private unless your lecturer requires public access.

## 2. Add the group
Invite all four students as collaborators. Everyone should use their own GitHub account; never share one account.

## 3. Initialize locally
```bash
git init
git add .
git commit -m "chore: initialize StockPilot monorepo baseline"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

## 4. Protect main
GitHub -> Settings -> Branches / Rulesets. Require pull requests, at least one approval, and passing CI before merge. Block force pushes and deletion of main.

## 5. Create team labels
`inventory`, `sales-demand`, `supplier`, `procurement`, `agentic-ai`, `backend`, `database`, `react`, `flutter`, `testing`, `docs`, `bug`.

## 6. Create a Project board
Columns/status: Backlog -> Ready -> In Progress -> Review -> Done. Every feature should have an issue and visible owner.

## 7. Assign ownership
Each student gets exactly one primary business component and one distinct Agentic AI contribution. Still, each owner must touch backend, PostgreSQL, React, Flutter, testing and documentation for their component.

## 8. Branch + PR workflow
```bash
git checkout main
git pull
git checkout -b feature/inventory-stock-count
# work + tests
git add .
git commit -m "feat: add stock count workflow"
git push -u origin feature/inventory-stock-count
```
Open a PR, link the issue, wait for CI, get teammate review, then merge.

## 9. First real scaffolding commands
Run these on a machine with the required SDKs installed.

### Backend
```bash
cd backend
dotnet new sln -n StockPilot
dotnet new webapi -n StockPilot.Api -o src/StockPilot.Api
dotnet new classlib -n StockPilot.Application -o src/StockPilot.Application
dotnet new classlib -n StockPilot.Domain -o src/StockPilot.Domain
dotnet new classlib -n StockPilot.Infrastructure -o src/StockPilot.Infrastructure
dotnet new xunit -n StockPilot.Api.Tests -o tests/StockPilot.Api.Tests
# Add projects to the solution and add project references according to the architecture.
```

### React
```bash
cd web
npm create vite@latest . -- --template react-ts
npm install
```

### Flutter
```bash
cd mobile
flutter create .
```

Commit each scaffold in a reviewed PR instead of one huge final upload.

## 10. First milestones
1. Health endpoint + PostgreSQL connection + first migration.
2. JWT login + four roles.
3. React login/dashboard shell.
4. Flutter login/navigation shell.
5. One thin vertical slice through API + DB.
6. Agent workflow state + one controlled tool proof-of-concept.
7. CI builds/tests real code on every PR.

## 11. Academic/process evidence
Keep commits regular and real. Use issues and PRs to show ownership, reviews, test evidence, merge/conflict handling and progress. Every member should be able to explain, debug and modify their code without AI during the viva.
