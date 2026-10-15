/* HTTP API smoke checks for the public contract. */
const assert = require('node:assert/strict');
const { server } = require('../server.js');

async function main() {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).engine, 'native-v3');

    const generated = await fetch(`${base}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ year: 2000, month: 8, day: 16, hour: 2, gender: 'female', targetSolarDate: '2026-10-15' }),
    });
    assert.equal(generated.status, 200);
    const body = await generated.json();
    assert.equal(body.success, true);
    assert.equal(body.chart.palaces.length, 12);
    assert.ok(body.native && body.horoscope && body.timeInfo);

    const invalid = await fetch(`${base}/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ year: 1900, month: 1, day: 1, hour: 2 }),
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json()).success, false);
    console.log('✓ API /health、/generate、无效日期');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
