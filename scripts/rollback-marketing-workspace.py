"""Restore only this UI refactor. Default is a read-only preflight."""
import argparse,hashlib,json,shutil
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apply',action='store_true',help='Restore the captured files after hash verification')
parser.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
a=parser.parse_args();root=a.root.resolve();backup=root/'.rollback/marketing-workspace-20260921'
manifest=json.loads((backup/'manifest.json').read_text())
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else None
for item in manifest['files']:
 p=root/item['path']
 if digest(p)!=item['afterSha256']:
  raise SystemExit('중단: 이후 변경이 감지되어 덮어쓰지 않습니다: '+item['path'])
 if item['existed'] and digest(backup/item['path'])!=item['beforeSha256']:
  raise SystemExit('중단: 백업 무결성 오류: '+item['path'])
print(f"검증 완료: {len(manifest['files'])}개 파일. 사용자 이벤트·실험 저장소는 변경하지 않습니다.")
if a.apply:
 for item in manifest['files']:
  p=root/item['path']
  if item['existed']:shutil.copy2(backup/item['path'],p)
  else:p.unlink(missing_ok=True)
 print('UI 변경 전 스냅샷으로 복원했습니다. 타입 검사·빌드를 실행하세요.')
else:print('읽기 전용 확인입니다. 실제 복원은 --apply 옵션을 사용하세요.')
