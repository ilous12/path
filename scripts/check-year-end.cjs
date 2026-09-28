const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '../apps/www');
const ts = require(require.resolve('typescript', {paths:[root]}));
const resolve = Module._resolveFilename;
Module._resolveFilename = function(name,parent,...rest) {
  return resolve.call(this,name.startsWith('@/')?path.join(root,name.slice(2)):name,parent,...rest);
};
require.extensions['.ts'] = (module,file) => module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,file);
const load = name => require(path.join(root,'components/market-performance',name));
const {YEAR_END_CAMPAIGNS: campaigns,YEAR_END_EVENTS: events} = load('year-end-scenarios.ts');
const {validateAlternative} = load('alternative-model.ts');
const {migrateAlternative,groupAlternative,validateGroup} = load('policy-group-model.ts');
const {experimentChartData} = load('experiment-chart-data.ts');
const {chartDisplayRange} = load('chart-period.ts');
const {MAX_DATE} = load('data.ts');
const {buildHomePerformance} = load('home-performance.ts');
const {YEAR_END_PIVOTS,SCENARIO_END} = load('year-end-performance.ts');
const {campaignTimelineProjection} = load('campaign-timeline-projection.ts');
assert.equal(campaigns.length,14);
assert.equal(new Set(campaigns.map(a=>a.id)).size,14);
for(const workspace of ['aiir','tdds']) {
  assert.equal(campaigns.filter(a=>a.workspace===workspace).length,7);
  assert.ok(events.some(e=>e.operator.toLowerCase()===workspace&&e.endAt.startsWith('2026-12-31')));
}
for(const campaign of campaigns) {
  assert.equal(validateAlternative(campaign),null,campaign.title);
  const group=migrateAlternative(campaign);
  assert.deepEqual(validateGroup(group.revisions[0]),[],campaign.title);
  assert.equal(group.executions.length,0,'Planning fixtures must not imply execution');
  const chart=experimentChartData(groupAlternative(group),'customers');
  for(const metric of ['customers','revenue']) {
    const connected=campaignTimelineProjection(groupAlternative(group),metric);
    const first=connected.rows[0];
    const actual=buildHomePerformance({start:first.date,end:first.date},campaign.workspace)[0];
    assert.equal(first.forecast,actual[metric],`${campaign.title}: ${metric} anchor`);
    assert.ok(connected.rows.every(r=>r.forecast===null||Number.isFinite(r.forecast)));
  }
  assert.ok(chart.rows.some(r=>Number.isFinite(r.forecast)),campaign.title);
  assert.ok(chart.rows.filter(r=>r.date>MAX_DATE).every(r=>r.observed===null));
  assert.ok(chart.forecastEnd<='2026-12-31');
  assert.equal(events.find(e=>e.id===`event-${campaign.id}`).targetChannels[0],campaign.channel);
}
const view=chartDisplayRange({start:'2026-08-30',end:'2026-09-28'});
assert.deepEqual(view,{start:'2026-08-23',end:'2026-10-05'});
for(const workspace of ['aiir','tdds']) {
  const range={start:'2026-09-22',end:SCENARIO_END};
  const rows=buildHomePerformance(range,workspace,true);
  assert.equal(rows.at(-1).key,SCENARIO_END);
  assert.equal(rows.length,101);
  assert.ok(rows.every(r=>r.cancellations<r.customers&&r.netProfit===r.revenue-r.expenses));
  for(const pivot of YEAR_END_PIVOTS.filter(p=>p.workspace===workspace)) {
    assert.equal(rows.find(r=>r.key===pivot.date).customers,pivot.lines);
  }
  assert.equal(buildHomePerformance(range,workspace).at(-1).key,MAX_DATE);
}
console.log('14 campaigns: validation, workspace linkage, projections, observation cutoff and date margins passed.');
