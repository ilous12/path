"""Collect public newsroom metadata; no article bodies are committed."""
import concurrent.futures, subprocess, re, html, json, pathlib
from urllib.parse import quote
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'data/research'
START='2024-09-21'; END='2026-09-21'
def fetch(url):
 r=subprocess.run(['curl','-f','-L','-s','--max-time','25',url],capture_output=True,text=True)
 return r.stdout if r.returncode==0 else ''
def clean(s):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s))).strip()
def archive(job):
 brand,page=job
 base='https://news.sktelecom.com/category/press-center' if brand=='SKT' else 'https://news.lguplus.com/category/'+quote('프레스센터/보도자료')
 url=base+(f'/page/{page}' if page>1 else '')
 s=fetch(url);rows=[]
 for block in s.split('</li>'):
  title=re.search(r'<h2 class="item-title">(.*?)</h2>',block,re.S) if brand=='SKT' else re.search(r'class="post-title">(.*?)</a>',block,re.S)
  if not title:continue
  links=re.findall(r'href="\s*(https://news\.(?:sktelecom|lguplus)\.com/\d+)"',block)
  date=re.search(r'class="(?:item-date[^"\n]*|post-date)">(\d{4}\.\d{2}\.\d{2})',block)
  if links and date:
   date=date[1].replace('.','-')
   if START<=date<=END:rows.append(dict(url=links[-1],title=clean(title[1]),date=date,brand=brand))
 return rows
if __name__=='__main__':
 rows=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  for i,result in enumerate(pool.map(archive,[(b,p) for b in ['SKT','LG U+'] for p in range(1,66)])):
   rows+=result
   if i%10==0: print('archive',i,'articles',len(rows),flush=True)
 rows=list({r['url']:r for r in rows}.values())
 (OUT/'telecom-news-inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
 print('total',len(rows),flush=True)
