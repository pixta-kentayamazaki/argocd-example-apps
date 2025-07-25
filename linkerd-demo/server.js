const express = require('express');
const redis = require('redis');

const app = express();
const client = redis.createClient({ host: 'redis', port: 6379 });

app.use(express.json());

app.get('/api/messages', async (req, res) => {
  try {
    const messages = await client.lRange('messages', 0, -1);
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    await client.lPush('messages', req.body.message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => {
  console.log('Backend running on port 3001');
});