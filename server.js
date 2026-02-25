const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const cron = require('node-cron');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(port, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
  });

  cron.schedule('0 2 * * *', async () => {
    console.log('[CRON] Starting SIENGE sync at', new Date().toISOString());
    try {
      const response = await fetch(`http://localhost:${port}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: process.env.SYNC_API_SECRET }),
      });
      const result = await response.json();
      console.log('[CRON] Sync result:', result.message);
    } catch (error) {
      console.error('[CRON] Sync error:', error);
    }
  }, {
    timezone: 'America/Sao_Paulo',
  });

  console.log('[CRON] Scheduled SIENGE sync for 2:00 AM (America/Sao_Paulo)');
});
