const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { runScreenshotForURL } = require('./screenshot-service'); // we’ll make this

const app = express();
app.use(express.json());
app.use(cors());

app.post('/api/generate', async (req, res) => {
  const { url } = req.body;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid or missing URL' });
  }

  try {
    const result = await runScreenshotForURL(url);
    return res.status(200).json({ message: 'Screenshots generated', files: result });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate screenshots' });
  }
});

app.use('/screenshots', express.static(path.join(__dirname, 'screenshots'))); // serve images

const PORT = 4000;
app.listen(PORT, () => console.log(`🚀 API running on http://localhost:${PORT}`));
