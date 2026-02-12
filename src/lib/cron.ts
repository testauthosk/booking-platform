// Built-in cron scheduler — runs inside Next.js server process
// No external dependencies, no extra Railway services

const CRON_SECRET = process.env.CRON_SECRET || '';
// Use internal private domain for server-to-server calls, or fall back to app URL
const APP_URL = process.env.RAILWAY_PRIVATE_DOMAIN
  ? `http://${process.env.RAILWAY_PRIVATE_DOMAIN}`
  : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

let started = false;

async function triggerReminders() {
  try {
    const res = await fetch(`${APP_URL}/api/reminders/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await res.json();
    const ts = new Date().toISOString();
    if (res.ok) {
      console.log(`[CRON ${ts}] Reminders: sent24h=${data.sent24h}, sent2h=${data.sent2h}, errors=${data.errors}`);
    } else {
      console.error(`[CRON ${ts}] Reminders failed:`, data);
    }
  } catch (error) {
    console.error(`[CRON ${new Date().toISOString()}] Reminders error:`, error);
  }
}

export function startCronJobs() {
  if (started) return;
  started = true;

  console.log(`[CRON] Starting built-in scheduler (reminders every 60 min)`);

  // Run reminders every 60 minutes
  setInterval(triggerReminders, 60 * 60 * 1000);

  // Also run once after 30s delay (let server fully start)
  setTimeout(triggerReminders, 30_000);
}
