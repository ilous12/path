"""Build a dated, source-labelled static event fixture. Run after source verification."""
import json,re,hashlib,random,collections
from pathlib import Path
from datetime import date,timedelta
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'apps/www/components/market-performance/fixtures';OUT.mkdir(exist_ok=True)
TODAY='2026-09-21';START='2024-09-21'
curated=[]
def add(day,operator,title,summary,url,kind='policy',effective=None):
 curated.append(dict(id='news-'+hashlib.sha256((url+title).encode()).hexdigest()[:14],types=[kind],title=title,startAt=day+'T00:00',operator=operator,channel='공식 발표' if 'sktelecom' in url else '뉴스',summary=summary,before='원문에 명시된 변경 전 수치 없음',after='발표·보도 내용은 요약 및 원문 참조',next='대상 고객·적용 조건과 실제 시행 여부를 확인한 뒤 대응 판단',sourceName='SKKT 뉴스룸' if 'sktelecom' in url else '뉴스핌',sourceUrl=url,recordedBy='MARS 공개자료 수집',recordedAt=TODAY+'T00:00',evidenceKind='reported',dateBasis='publication',publishedAt=day,effectiveDate=effective,marketSegment='MVVNO' if operator=='mvvno' else 'MNO',sourceTitle=title))
skkt='https://news.sktelecom.com/211423'
add('2025-04-22','SKKT','SKKT · 유심 정보 유출 정황 공개','4월 19일 탐지한 유심 관련 정보 유출 정황을 22일 공개했다. 이는 당시 발표 기준이며 최종 피해 범위와 구분한다.',skkt,'ai:보안사고','2025-04-19')
add('2025-04-22','SKKT','SKKT · KISA 침해 신고 및 개인정보 유출 정황 신고','KISA에는 4월 20일, 개인정보보호위원회에는 22일 신고했다고 밝혔다.',skkt,'ai:보안대응','2025-04-20')
add('2025-04-22','SKKT','SKKT · 악성코드 제거와 의심 장비 격리','유출 가능성 인지 후 악성코드를 제거하고 관련 장비를 격리했다고 발표했다.',skkt,'ai:보안대응')
package='https://news.sktelecom.com/en/1979'
add('2025-07-04','SKKT','SKKT · 8월 통신요금 50% 감면 계획 발표','고객 감사 프로그램으로 8월 요금 감면 계획을 발표했다. 알뜰폰 적용은 사업자 협의 조건으로 안내했다.',package,'price','2025-08-01')
add('2025-07-04','SKKT','SKKT · 연말까지 월 50GB 추가 제공 계획','8~12월 추가 데이터 혜택을 발표했다. 발표일과 예정 적용일을 구분해 기록한다.',package,'benefit','2025-08-01')
add('2025-07-04','SKKT','SKKT · 해지 고객 위약금 면제와 복귀 혜택 발표','사고 이후 해지 고객의 위약금 면제 조건과 재가입 시 가입연수·멤버십 복원 방안을 발표했다.',package,'policy')
add('2025-07-04','SKKT','SKKT · 5년간 정보보호 7천억원 투자 계획','보안 투자, 인력 확충, CISO 권한 및 점검 체계 강화 방안을 발표했다. 투자 완료를 의미하지 않는다.',package,'ai:보안대응')
kt='https://m.newspim.com/news/view/20250911001149'
add('2025-09-11','KT','KT · 불법 초소형 기지국 관련 소액결제 피해 대응 공개','9월 11일 브리핑에서 피해 조사 경과와 고객 보호 방안을 공개했다. 원인·피해 범위는 당시 조사 기준이다.',kt,'ai:보안사고')
add('2025-09-11','KT','KT · 비정상 결제 패턴 차단 및 자동화 적용','9월 5일 비정상 결제 차단, 6일 자동화 시스템 적용 사실을 설명했다.',kt,'ai:보안대응','2025-09-05')
add('2025-09-11','KT','KT · 미등록 초소형 기지국 접속 차단','관리시스템에 없는 기지국의 망 접속을 차단하고 신규 등록을 중단했다고 설명했다.',kt,'ai:보안대응')
add('2025-09-11','KT','KT · 피해 관련 고객 무료 유심 교체 지원','신호 수신 및 식별정보 전송 정황 고객에게 유심 교체와 보호서비스를 지원한다고 밝혔다.',kt,'benefit')
add('2025-09-11','KT','KT · 피해 고객 보상 및 전담센터 운영','금전 피해 전액 보상 방침과 24시간 전담센터 운영, 미출금 결제 취소 등 보호조치를 설명했다.',kt,'policy')
news=[
('2025-11-02','KT','KT · 요고 포인트 선택 혜택 출시','요고 69·61의 SIM 신규 고객이 구독 서비스 대신 제휴 포인트를 선택하는 혜택을 출시했다.','20251102000095','benefit'),
('2026-07-02','KT','KT · 5G·LTE 통합요금제 출시 보도','7월 1일 통합요금제 출시와 18종 구성, 연령별 혜택 자동 적용을 보도했다.','20260702000085','product'),
('2025-10-16','KT','KT · 지니 TV 디즈니+ 모든G 출시 예고','10월 17일 출시 예정인 콘텐츠 결합 상품과 가입 프로모션을 발표했다.','20251016000209','product'),
('2025-08-10','KT','KT · 위버스 결합 5G 요금제 출시','팬덤 고객을 겨냥한 위버스 제휴 요금제 출시가 보도됐다.','20250810000028','product'),
('2025-08-07','KT','KT · 1인 가구 생활혜택 Plus 출시','분가 고객의 유무선 결합과 생활 쿠폰 혜택을 결합한 상품을 선보였다.','20250807000852','benefit'),
('2026-08-07','mvvno','헬로모바일 · 교보문고 제휴 요금제 출시','전자책 구독 및 교환권 혜택을 결합한 LTE 요금제 6종을 출시했다.','20260807000541','product'),
('2025-12-18','mvvno','헬로모바일 · 안심보험 결합 요금제 출시','금융사기·상해 등의 보험 혜택을 결합한 알뜰폰 요금제 4종을 출시했다.','20251218000140','product'),
('2026-08-11','mvvno','KT엠모바일 · 34종 요금제 가격 인하','고용량·무제한을 포함한 34종 요금제 가격 인하를 발표했다.','20260811000468','price'),
]
for d,o,t,s,n,k in news:add(d,o,t,s,'https://www.newspim.com/news/view/'+n,k)
verified=json.loads((ROOT/'data/research/telecom-news-verified.json').read_text())
# Same joint announcement or same-day reprint is a single market event.
exclude={'229460','213019','21112','20111'}
rows=[r for r in verified if r['verified'] and r['url'].split('/')[-1] not in exclude and not re.search('수상|표창|세미나|인재 키운다|국제 무대|알파키|가입자망 자율화|퀀텀코리아',r['title'])]
# Prefer actionable consumer-market reports, then fill from verified service/security records.
rows.sort(key=lambda r:(0 if re.search('요금|유심|침해|에어|알뜰폰|로밍|혜택|개통|피싱|멤버십',r['title']) else 1,r['date'],r['url']))
remaining=200-len(curated)
if len(rows)<remaining:
 for r in verified:
  if r['verified'] and r['url'].split('/')[-1] not in exclude and r not in rows: rows.append(r)
assert len(rows)>=remaining,(len(rows),remaining)
def topic(t):
 for pattern,kind,question in [
 ('침해|해킹|유심|보안|피싱|스팸','ai:보안대응','고객 문의·해지율·보호조치 이용률의 변화를 확인'),
 ('요금|가격','price','동일 데이터·약정 조건으로 실질 납부액과 마진을 비교'),
 ('개통|사전예약','campaign','신규 단말 수요와 번호이동·개통 전환율을 확인'),
 ('로밍|멤버십|할인|혜택|프로모션','benefit','혜택 이용률과 비용·유지율을 분리해 비교'),
 ('출시','product','상품 구성 및 자사 상품과의 수요 중복을 확인')]:
  if re.search(pattern,t):return kind,question
 return 'policy','고객 경험·운영 비용에 미칠 영향을 별도로 검증'
real=curated[:]
for r in rows[:remaining]:
 t=r['title'];kind,next_=topic(t)
 op='aiir' if re.search('에어|에어\\(aiir',t) else ('mvvno' if re.search('알뜰폰|알닷|토스모바일',t) else r['brand'])
 real.append(dict(id='news-'+r['brand'].replace(' ','').replace('+','plus').lower()+'-'+r['url'].split('/')[-1],types=[kind],title=t,startAt=r['date']+'T00:00',operator=op,channel='공식 뉴스룸',summary='공식 뉴스룸에 게시된 시장 조치·서비스 발표 기록입니다. 제목은 원문 기준이며, 시행 완료 및 실적 효과는 별도 확인이 필요합니다.',before='변경 전 조건은 원문 확인 필요',after='기사 제목의 조치·발표를 관측',next=next_+' (분석 과제이며 인과관계 확정 아님)',sourceName=r['brand']+' 뉴스룸',sourceUrl=r['url'],sourceTitle=r['sourceTitle'],publishedAt=r['date'],recordedAt=TODAY+'T00:00',recordedBy='MARS 공개자료 수집',evidenceKind='reported',dateBasis='publication',marketSegment='MVVNO' if op=='mvvno' else 'MNO'))
# Preserve news chronology; only synthetic fixtures receive random dates.
rng=random.Random(20260921);start=date.fromisoformat(START);end=date.fromisoformat(TODAY)
templates=[('price','20GB 요금 10% 인하','월 22,000원','월 19,800원'),('benefit','가입 고객 데이터 5GB 추가','기본 데이터 제공','30일간 5GB 추가'),('campaign','번호이동 가입 포인트 지급','포인트 없음','가입 후 30일 유지 시 10,000P'),('channel','셀프개통 안내 단계 축소','6단계 안내','4단계 안내'),('policy','해지 방어 상담 우선 배정','일반 상담 큐','해지 문의 우선 연결'),('ai:보안대응','유심 보호 설정 안내 강화','일반 가입 안내','가입 완료 화면에 보안 설정 안내'),('product','시니어 저용량 상품 구성','일반 5GB 상품','상담 지원 포함 시니어 5GB'),('benefit','장기 고객 로밍 쿠폰 제공','기본 로밍 요금','2년 유지 고객 로밍 쿠폰')]
demo=[]
for i in range(100):
 d=start+timedelta(days=rng.randrange((end-start).days+1));op=['SKKT','MNO','mvvno','tdds','aiir'][i%5];kind,title,before,after=templates[rng.randrange(len(templates))];duration=rng.choice([3,7,14,30]);last=min(end,d+timedelta(days=duration-1))
 demo.append(dict(id=f'demo-telecom-{i+1:03}',types=[kind],title=f'[데모] {op.upper()} · {title}',startAt=d.isoformat()+'T09:00',endAt=last.isoformat()+'T23:59',operator=op,channel=rng.choice(['APP','WEB','MOYO','공식','TDDS']),summary='랜덤 생성한 가상 운영 이벤트입니다. 해당 회사가 실제로 수행했다는 의미가 아니며 실적은 합성 데이터입니다.',before=before,after=after,next='비교군과 비용 제약을 설정해 가설을 검증',sourceName='MARS 랜덤 데모 · 실제 사례 아님',recordedAt=TODAY+'T00:00',recordedBy='고정 시드 데모 생성기',evidenceKind='demo',dateBasis='synthetic',marketSegment='MVVNO' if op=='mvvno' else 'MNO'))
real.sort(key=lambda r:(r['startAt'],r['id']));demo.sort(key=lambda r:(r['startAt'],r['id']))
for name,content in [('telecom-news.json',real),('telecom-demo.json',demo)]: (OUT/name).write_text(json.dumps(content,ensure_ascii=False,indent=2)+'\n')
manifest=dict(asOf=TODAY,windowStart=START,actualEvents=len(real),demoEvents=len(demo),sourceCount=len(set(r['sourceUrl'] for r in real)),operators=dict(collections.Counter(r['operator'] for r in real)),dateBasis='실제 이벤트는 발표일 기준. 기사 내 시행일은 effectiveDate에 별도 기록. 00:00은 정렬용이며 발생 시각 아님.',method='공식 기사 메타데이터 확인 + 보안사고·KT·MVVNO 조치 수동 분해. 실제 기사 날짜는 무작위 변경하지 않음.',limitations='보도된 사실·계획이며 독립적인 시행 실사 아님. 뉴스룸 표본은 SKKT·LG U+ 비중이 높음. 실적은 합성값으로 뉴스와 인과 연계되지 않음.')
(OUT/'telecom-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');print(json.dumps(manifest,ensure_ascii=False,indent=2))
