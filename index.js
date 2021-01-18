const express = require('express');
const level = require('level');

const db = level('db');
const app = express();

app.use(express.json());
app.use(express.static('public/'));

app.get('/xhr', async (_, res) => {
  res.json(JSON.parse(await db.get('reports')));
});

app.post('/update/:id', async (req, res) => {
  const orig = JSON.parse(await db.get('reports'));
  orig[req.params.id] = req.body;
  await db.put('updates', JSON.stringify(Object.assign(await db.get('updates'), { [req.params.id]: new Date().getTime() })));
  await db.put('reports', JSON.stringify(orig));
  res.sendStatus(200);
});

db.put('reports', "{}", (err, val) => {
  if (err) return console.error('fatal: couldn\'t write to db');
  app.listen(8000, () => {
    console.log('init: listening');
  });
});
