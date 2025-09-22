// Minimal Alexa Lambda handler for Cherry Chores
// Env: API_BASE_URL, API_TOKEN (parent long-lived token)

const API = process.env.API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
const TOKEN = process.env.API_TOKEN;

async function api(path, opts = {}) {
  if (!TOKEN) throw new Error('Missing API_TOKEN');
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': TOKEN,
      ...(opts.headers || {})
    }
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const data = await res.json(); if (data?.error) msg += `: ${data.error}`; } catch {}
    throw new Error(msg);
  }
  try { return await res.json(); } catch { return null; }
}

async function getFamilies() {
  return api('/families');
}
async function getChildren(familyId) {
  return api(`/families/${familyId}/children`);
}
async function getTodayChores(childId) {
  return api(`/children/${childId}/chores?scope=today`);
}
async function completeChore(choreId, childId) {
  return api(`/chores/${encodeURIComponent(choreId)}/complete`, { method: 'POST', body: JSON.stringify({ childId }) });
}
async function getBalance(childId) {
  return api(`/bank/${childId}`);
}

function findChildByName(children, name) {
  if (!name) return children[0];
  const lower = name.toLowerCase();
  return children.find(c => c.displayName?.toLowerCase() === lower)
      || children.find(c => c.displayName?.toLowerCase().startsWith(lower))
      || children.find(c => c.username?.toLowerCase() === lower)
      || null;
}

function findChoreByName(list, name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  return list.find(c => c.name?.toLowerCase() === lower)
      || list.find(c => c.name?.toLowerCase().includes(lower))
      || null;
}

function speak(text) {
  return {
    version: '1.0',
    response: {
      outputSpeech: { type: 'PlainText', text },
      shouldEndSession: true
    }
  };
}

export const handler = async (event) => {
  try {
    const type = event.request?.type;
    if (type === 'LaunchRequest') {
      return speak('Welcome to Cherry Chores. Ask about chores or balances.');
    }
    if (type === 'IntentRequest') {
      const intent = event.request.intent?.name;
      const slots = event.request.intent?.slots || {};
      const childName = slots.ChildName?.value;
      const choreName = slots.ChoreName?.value;

      const families = await getFamilies();
      const family = families?.[0];
      if (!family) return speak('I could not find a family linked to this token.');
      const children = await getChildren(family.id);
      if (!Array.isArray(children) || children.length === 0) return speak('There are no children in your family yet.');

      if (intent === 'GetChoresIntent') {
        const child = findChildByName(children, childName);
        if (!child) return speak(`I couldn't find ${childName}.`);
        const chores = await getTodayChores(child.id);
        if (!chores || chores.length === 0) return speak(`${child.displayName} has no chores today.`);
        const remaining = chores.filter(c => !c.status || c.status === 'due' || c.status === 'planned');
        if (remaining.length === 0) return speak(`${child.displayName} finished all chores for today. Great job!`);
        const names = remaining.map(c => c.name).slice(0, 5).join(', ');
        return speak(`${child.displayName} has ${remaining.length} chore${remaining.length>1?'s':''} today: ${names}.`);
      }

      if (intent === 'CompleteChoreIntent') {
        const child = findChildByName(children, childName);
        if (!child) return speak(`I couldn't find ${childName}.`);
        const chores = await getTodayChores(child.id);
        const match = findChoreByName(chores || [], choreName);
        if (!match) return speak(`I couldn't find the chore ${choreName} for ${child.displayName} today.`);
        await completeChore(match.id, child.id);
        return speak(`Marked ${match.name} as completed for ${child.displayName}.`);
      }

      if (intent === 'GetBalanceIntent') {
        const child = findChildByName(children, childName);
        if (!child) return speak(`I couldn't find ${childName}.`);
        const bal = await getBalance(child.id);
        const amt = Math.round((bal?.balance?.available || 0) * 100) / 100;
        return speak(`${child.displayName} has ${amt} coins available.`);
      }

      if (intent === 'GetRemainingChoresIntent') {
        // Summarize remaining chores for all children
        const reports = [];
        for (const ch of children) {
          const chores = await getTodayChores(ch.id);
          const remaining = (chores || []).filter(c => !c.status || c.status === 'due' || c.status === 'planned');
          if (remaining.length > 0) {
            reports.push(`${ch.displayName}: ${remaining.length}`);
          }
        }
        if (reports.length === 0) return speak('All chores are complete for today.');
        return speak(`Remaining chores — ${reports.join('; ')}.`);
      }

      return speak('Sorry, I did not understand that request.');
    }
    if (type === 'SessionEndedRequest') {
      return speak('Goodbye.');
    }
    return speak('Hello from Cherry Chores.');
  } catch (err) {
    console.error(err);
    return speak('Something went wrong talking to Cherry Chores.');
  }
};
