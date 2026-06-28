/**
 * cluster.js — Load Balancer Entry Point
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses Node.js built-in `cluster` module to fork one worker process per CPU
 * core. This means if your server has 4 cores, 4 instances of server.js run
 * simultaneously behind a single port — the OS distributes incoming requests
 * across all workers automatically.
 *
 * Why this matters:
 *   • Node.js is single-threaded by default — one CPU core per process.
 *   • With clustering, a slow scan/AI request on Worker 1 does NOT block
 *     a user hitting Worker 2/3/4.
 *   • Effectively multiplies your throughput by the number of CPU cores.
 *
 * On Render free tier (1 CPU): only 1 worker is spawned — identical to
 * running server.js directly, zero downside.
 * On paid tiers or self-hosted (4+ CPUs): 4+ workers, real parallelism.
 *
 * Usage:
 *   npm start        → runs this file (see package.json)
 *   npm run dev      → runs server.js directly via nodemon (dev only)
 */

const cluster = require('cluster');
const os      = require('os');

const NUM_CPUS = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`🚀 Primary process ${process.pid} started`);
  console.log(`⚙️  Spawning ${NUM_CPUS} worker(s) across ${NUM_CPUS} CPU core(s)...`);

  // Fork one worker per CPU core
  for (let i = 0; i < NUM_CPUS; i++) {
    cluster.fork();
  }

  // If a worker crashes, restart it automatically
  cluster.on('exit', (worker, code, signal) => {
    if (signal) {
      console.log(`⚠️  Worker ${worker.process.pid} killed by signal: ${signal}`);
    } else if (code !== 0) {
      console.error(`❌ Worker ${worker.process.pid} exited with code ${code} — restarting...`);
      cluster.fork(); // auto-restart crashed worker
    } else {
      console.log(`✅ Worker ${worker.process.pid} exited cleanly`);
    }
  });

  cluster.on('online', (worker) => {
    console.log(`✅ Worker ${worker.process.pid} is online`);
  });

} else {
  // Workers run the actual Express server
  require('./server.js');
  console.log(`🔧 Worker ${process.pid} started`);
}
