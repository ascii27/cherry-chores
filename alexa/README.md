Cherry Chores Alexa Skill

Overview
- Provides voice interactions for kids and parents:
  - Kids: “What chores do I have today?”
  - Kids: “I finished <chore>.”
  - Kids: “How much money is in my bank?”
  - Parents: “What chores are left to finish?” (responds for all children)

Structure
- `src/index.js`: AWS Lambda handler for Alexa skill requests. Calls the Cherry Chores API with a long‑lived API token.
- `models/en-US.json`: Example interaction model with intents and sample utterances.

Configuration
- API host: set `API_BASE_URL` (e.g. https://api.yourdomain.com)
- API token: set `API_TOKEN` to a parent long‑lived token created in Parent Dashboard → API Tokens.

Local Dev
- The handler expects standard Alexa request JSONs. You can use the Alexa Developer Console or ask-cli to wire this Lambda and interaction model.
- Node.js 18+ recommended (uses global fetch).

Intents
- GetChoresIntent (ChildName optional): lists today’s chores for the child; if no child provided, attempts to infer the first child.
- CompleteChoreIntent (ChildName, ChoreName): marks the chore complete for today.
- GetBalanceIntent (ChildName optional): reads the available balance for the child.
- GetRemainingChoresIntent: for parents; summarizes remaining chores for all children today.

Notes
- Name matching is case-insensitive and fuzzy by prefix where possible.
- This is a minimal, dependency-free handler; you can migrate to ask-sdk later if desired.

