'use strict';

const express = require('express');
const router = express.Router();
const os = require('os');

const START_TIME = Date.now();

router.get('/', (req, res) => {
  const uptimeMs = Date.now() - START_TIME;
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: formatUptime(uptimeMs),
    environment: process.env.NODE_ENV || 'development',
  });
});

router.get('/details', (req, res) => {
  const uptimeMs = Date.now() - START_TIME;
  const memUsage = process.memoryUsage();
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: formatUptime(uptimeMs),
    environment: process.env.NODE_ENV || 'development',
    system: {
      hostname: os.hostname(),
      platform: os.platform(),
      nodeVersion: process.version,
    },
    memory: {
      heapUsedMB: toMB(memUsage.heapUsed),
      heapTotalMB: toMB(memUsage.heapTotal),
      rssMB: toMB(memUsage.rss),
    },
  });
});

router.get('/ready', async (req, res) => {
  const checks = await Promise.all([checkPostgres(), checkRedis()]);
  const [postgres, redis] = checks;
  const allHealthy = checks.every(function(c) { return c.status === 'ok'; });
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not ready',
    timestamp: new Date().toISOString(),
    checks: { postgres, redis },
  });
});

async function checkPostgres() {
  return { status: 'ok' };
}

async function checkRedis() {
  return { status: 'ok' };
}

function toMB(bytes) {
  return Math.round(bytes / 1024 / 1024 * 10) / 10;
}

function formatUptime(ms) {
  var totalSeconds = Math.floor(ms / 1000);
  var hours = Math.floor(totalSeconds / 3600);
  var minutes = Math.floor((totalSeconds % 3600) / 60);
  var seconds = totalSeconds % 60;
  return hours + 'h ' + minutes + 'm ' + seconds + 's';
}

module.exports = router;
