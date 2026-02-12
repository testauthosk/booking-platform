// Next.js instrumentation hook — runs once on server startup
// Used for built-in cron jobs (no external scheduler needed)

export async function register() {
  // Only run on the server (not during build or in edge runtime)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startCronJobs } = await import('@/lib/cron');
    startCronJobs();
  }
}
