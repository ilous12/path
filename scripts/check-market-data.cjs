// Run: node scripts/check-market-data.cjs
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const Module = require('node:module');
const root = path.resolve(__dirname, '../apps/www');
const ts = require(require.resolve('typescript', { paths: [root] }));
const resolve = Module._resolveFilename;
Module._resolveFilename = function (name, parent, ...rest) {
  return resolve.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, parent, ...rest);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
const load = name => require(path.join(root, 'components/market-performance', name));
const { buildPerformance, groupEvents, eventOwnership, EVENTS, MIN_DATE, MAX_DATE } = load('data.ts');
const { buildChannels } = load('channel-data.ts');
const { buildEventInsights } = load('event-insights.ts');
const { buildAnalysis } = load('analysis-data.ts');
const { mergeCustomEvents } = load('event-validation.ts');
const { forecastPolicy, FORECAST_METHODS } = load('forecast.ts');
const sum = (rows, key) => rows.reduce((total, row) => total + row[key], 0);
for (const range of [{start: MIN_DATE, end: MAX_DATE}, {start:'2026-08-19',end:MAX_DATE}, {start:'2026-09-11',end:MAX_DATE}, {start:MAX_DATE,end:MAX_DATE}]) {
  const daily = buildPerformance(range, 'day');
  for (const row of daily) {
    assert.equal(row.netProfit, row.revenue - row.expenses);
    assert.ok(row.cancellations <= row.customers);
    assert.ok(Object.values(row).filter(v => typeof v === 'number').every(Number.isFinite));
  }
  for (const grain of ['month','year']) for (const metric of ['customers','cancellations','revenue','expenses','netProfit']) assert.equal(sum(buildPerformance(range,grain),metric),sum(daily,metric));
  const channels = buildChannels(range);
  assert.equal(sum(channels,'total'),sum(daily,'customers'));
  assert.equal(sum(channels,'revenue'),sum(daily,'revenue'));
  for (const channel of channels) assert.equal(channel.total,channel.newLines+channel.transfers);
  const hidden = EVENTS.filter((_,i) => i % 3 === 0).map(e => e.id);
  const grouped = groupEvents(range,'day',hidden).flatMap(g => g.events);
  for (const workspace of ['aiir','tdds','mvvno']) {
    const insights = buildEventInsights(range,hidden,EVENTS,workspace);
    const analysis = buildAnalysis(range,hidden,EVENTS,'growth',workspace);
    assert.deepEqual(insights.events.map(e=>e.id).sort(),grouped.map(e=>e.id).sort());
    assert.deepEqual(analysis.summary.events, insights.events);
    assert.equal(insights.ownCount, insights.events.filter(e=>e.operator.toLowerCase()===workspace).length);
    assert.equal(insights.ownCount+insights.competitorCount, insights.events.length);
  }
  for (const method of Object.keys(FORECAST_METHODS)) {
    const forecast = forecastPolicy(daily.slice(-28),method,{customers:.2,cancellations:-.1,revenue:.1,netProfit:-.2});
    assert.equal(forecast.length,30);
    for (const row of forecast) for (const data of [row.current,row.predicted]) {
      assert.ok(Object.values(data).every(Number.isFinite));
      assert.ok(data.cancellations <= data.customers);
      assert.ok(data.revenue>=0 && data.customers>=0 && data.cancellations>=0);
    }
  }
}
const custom = {...EVENTS[0],id:'custom-test',startAt:'2026-09-01T12:00',endAt:undefined,types:['price']};
assert.equal(mergeCustomEvents(EVENTS,[custom,custom]).length,EVENTS.length+1);
for (const invalid of [{...custom,startAt:'2026-02-30T12:00'},{...custom,endAt:'2026-08-01T12:00'},{...custom,types:[]},{...custom,sourceName:12}]) assert.equal(mergeCustomEvents(EVENTS,[invalid]).length,EVENTS.length);
assert.equal(eventOwnership([{...custom,operator:'aiir'}],'tdds').label,'경쟁사 이벤트');
assert.equal(buildEventInsights({start:'2026-08-19',end:MAX_DATE},EVENTS.map(e=>e.id)).events.length,0);
console.log('PASS: daily/monthly/yearly totals, channel reconciliation, workspace ownership, hidden-event consistency, event validation, all forecast methods.');

const negativeHistory = Array.from({length:28},()=>({customers:100,cancellations:10,revenue:1000,netProfit:-100}));
const originalHistory = JSON.stringify(negativeHistory);
for (const method of ['average','smoothing','damped','trend']) for (const horizon of [7,14,30,90]) {
 const zero=forecastPolicy(negativeHistory,method,{customers:0,cancellations:0,revenue:0,netProfit:0},horizon);
 const stress=forecastPolicy(negativeHistory,method,{customers:0,cancellations:0,revenue:0,netProfit:-.5},horizon);
 assert.equal(zero.length,horizon);
 assert.deepEqual(zero.at(-1).current,zero.at(-1).predicted);
 assert.equal(zero.at(-1).predicted.netProfit,-100);
 assert.equal(stress.at(-1).predicted.netProfit,-150);
}
assert.equal(JSON.stringify(negativeHistory),originalHistory);
console.log('PASS: 7/14/30/90-day model comparison, signed profit sensitivity, zero-effect baseline, immutable observations.');
