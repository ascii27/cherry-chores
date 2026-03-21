# Cherry Chores — Claude Instructions

## Dev Server (exe.dev VM)

The dev server runs on an exe.dev VM at **river-anchor.exe.xyz**, not locally.

### Connecting

```
# Shell into the VM
ssh river-anchor.exe.xyz

# Transfer a file
scp <file> river-anchor.exe.xyz:~/
```

SSH config (add to `~/.ssh/config` if not already present):

```
Host exe.dev *.exe.xyz
  IdentitiesOnly yes
  IdentityFile ~/.ssh/id_ed25519
  StrictHostKeyChecking accept-new
```

### API server

- HTTPS is routed to **port 8000** by exe.dev automatically.
- Logs: `/tmp/api.log` on the VM.

**Start:**
```bash
cd ~/cherry-chores && PORT=8000 nohup npm run dev -w api > /tmp/api.log 2>&1 & disown
```

**Check logs:**
```bash
ssh river-anchor.exe.xyz "tail -n 100 /tmp/api.log"
```

**Restart:**
```bash
ssh river-anchor.exe.xyz "pkill -f 'ts-node\|nodemon\|node.*api' ; cd ~/cherry-chores && PORT=8000 nohup npm run dev -w api > /tmp/api.log 2>&1 & disown"
```

### Deploying updates

```bash
# 1. Push branch locally
git push origin <branch>

# 2. On the VM: pull, build frontend, restart API
ssh river-anchor.exe.xyz "cd ~/cherry-chores && git pull origin <branch> && npm run build -w web"
# then restart as above
```

> Do NOT run local dev servers — the VM is the target environment.
