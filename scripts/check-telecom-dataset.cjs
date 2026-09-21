const assert=require('node:assert/strict');
const path=require('node:path');
const base='../apps/www/components/market-performance/fixtures/';
const real=require(base+'telecom-news.json'),demo=require(base+'telecom-demo.json'),experiments=require(base+'telecom-experiments.json');
assert.equal(real.length,200);assert.equal(demo.length,100);assert.equal(experiments.length,12);
assert.equal(new Set([...real,...demo].map(e=>e.id)).size,300);
for(const event of [...real,...demo]){
 assert.ok(event.startAt.slice(0,10)>='2024-09-21'&&event.startAt.slice(0,10)<='2026-09-21');
 assert.ok(!event.endAt||event.endAt>=event.startAt);
 if(event.evidenceKind==='reported'){
  assert.match(event.sourceUrl,/^https:\/\//);assert.equal(event.publishedAt,event.startAt.slice(0,10));assert.equal(event.dateBasis,'publication');
 }else{assert.match(event.title,/^\[데모\]/);assert.equal(event.dateBasis,'synthetic');assert.ok(!event.sourceUrl);}
}
assert.ok(real.some(e=>e.sourceUrl.includes('/211423')));assert.ok(real.some(e=>e.sourceUrl.includes('20250911001149')));
for(const workspace of ['air','tds','mvno']) assert.ok(experiments.some(e=>e.workspace===workspace));
assert.ok(experiments.every(e=>e.status==='draft'&&e.title.startsWith('[가상 실험]')));
console.log('PASS: 200 reported events, 100 labelled demos, 12 draft experiments; dates, sources, IDs and workspace coverage.');
