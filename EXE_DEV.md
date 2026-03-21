# exe.dev VM — river-anchor

The dev/staging environment runs on an [exe.dev](https://exe.dev) VM at `river-anchor.exe.xyz`.

## Connecting

```bash
ssh river-anchor.exe.xyz
```

Recommended SSH config (`~/.ssh/config`):

```
Host exe.dev *.exe.xyz
  IdentitiesOnly yes
  IdentityFile ~/.ssh/id_ed25519
  StrictHostKeyChecking accept-new
```

> No passwords or credentials should be stored here. SSH key auth only.

## Routing

exe.dev automatically routes HTTPS → **port 8000** on the VM.

## API server

**Start:**
```bash
cd ~/cherry-chores && PORT=8000 nohup npm run dev -w api > /tmp/api.log 2>&1 & disown
```

**Restart:**
```bash
pkill -f 'ts-node\|nodemon\|node.*api'
cd ~/cherry-chores && PORT=8000 nohup npm run dev -w api > /tmp/api.log 2>&1 & disown
```

**Logs:**
```bash
tail -n 100 /tmp/api.log
tail -f /tmp/api.log   # follow
```

## Deploying updates

```bash
# 1. Push your branch locally
git push origin <branch>

# 2. On the VM: pull + rebuild frontend
ssh river-anchor.exe.xyz "cd ~/cherry-chores && git pull origin <branch> && npm run build -w web"

# 3. Restart the API (see above)
```

The API serves the built frontend from `web/dist` — always rebuild after frontend changes.

## Environment

Env vars live in `~/cherry-chores/.env` on the VM. Do not commit this file.
