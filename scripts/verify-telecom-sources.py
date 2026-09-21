import json,re,html,concurrent.futures,datetime
from pathlib import Path
from importlib.util import spec_from_file_location,module_from_spec
spec=spec_from_file_location('collector',Path(__file__).with_name('collect-telecom-news.py'));m=module_from_spec(spec);spec.loader.exec_module(m)
rows=json.loads((m.OUT/'telecom-news-candidates.json').read_text())
def verify(r):
 s=m.fetch(r['url'])
 if not s:return {**r,'verified':False}
 mt=re.search(r'<meta[^>]*property="article:published_time"[^>]*content="([^"]+)"',s)
 if not mt:return {**r,'verified':False}
 date=datetime.datetime.fromisoformat(html.unescape(mt[1])).astimezone(datetime.timezone(datetime.timedelta(hours=9))).date().isoformat()
 title=re.search(r'<meta[^>]*property="og:title"[^>]*content="([^"]+)"',s)
 return {**r,'date':date,'verified':m.START<=date<=m.END,'retrievedAt':m.END,'sourceTitle':html.unescape(title[1]) if title else r['title']}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 result=[]
 for i,r in enumerate(pool.map(verify,rows)):
  result.append(r)
  if i%30==0:print('verified',i,flush=True)
(m.OUT/'telecom-news-verified.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print('OK',sum(r['verified'] for r in result),'/',len(result),flush=True)
