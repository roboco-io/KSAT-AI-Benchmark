# 수능 AI 모델의 공통 오답과 상호보완성

현재 저장 답안을 분석한 탐색 연구다. 모델을 호출하지 않는다. 기존 데이터·답안·웹 화면은 수정하지 않는다.

- [연구 보고서](REPORT.md)
- [전체 계산 결과](outputs/analysis.json)
- [입력 출처와 SHA-256](inputs/manifest.json)
- `outputs/*-pairs.csv`: 모델 쌍별 실패 중첩·동일 오답·oracle 상한
- `outputs/*-items.csv`: 문항별 정답 모델·오답 선택·미응답·투표
- `outputs/*-triples.csv`: 가능한 모든 3개 모델 조합의 탐색 결과
- [오답 중첩 그림](outputs/error-overlap.png), [투표 성능 그림](outputs/voting-performance.png)

## 재현

저장소 루트에서 Python 3 표준 라이브러리로 실행한다.

```bash
python3 research/common-errors/analyze.py
python3 -m unittest discover -s research/common-errors -p 'test_*.py' -v
python3 research/common-errors/verify.py
python3 research/common-errors/render_report.py
```

그림 생성에만 matplotlib가 필요하다.

```bash
python3 research/common-errors/plot.py
```

입력은 `inputs/`의 고정 스냅샷이다. 현재 작업 트리의 공개 JSON에서 필요한 필드만 보존했으며, 미커밋 변경을 포함할 수 있다. 원본 파일과 스냅샷의 해시를 각각 기록했다. 분석기는 스냅샷 해시를 확인한 뒤 계산한다. 공개 JSON이 바뀌어도 자동으로 입력을 갱신하지 않는다. 스냅샷에는 모델 메타데이터·답·채점 상태가 있고 풀이 해설·토큰 비용은 없다.

보고서는 `ledger.json`의 근거 문장을 읽어 생성한다. `analyze.py`를 바꾸거나 입력을 바꾼 경우 계산 결과와 원장의 일치 여부를 검토하고 원장을 갱신해야 한다. 근거 목록 및 정형 findings는 `docs/plans/2026-11-22-common-errors.*.md`에 있다.

## 웹 게시

[웹 보고서](https://roboco.io/KSAT-AI-Benchmark/research/common-errors.html)와 [대시보드 연구 섹션](https://roboco.io/KSAT-AI-Benchmark/#research)에서 소개한다. 웹 빌드의 prebuild가 `publish.mjs`를 실행해 고정 보고서·입력·그림·분석 자료를 `web/public/research/common-errors/`로 복사한다. 현재 대시보드 결과로 연구 입력을 덮어쓰지 않는다. 배포 CI는 정적 HTML과 다운로드 경로를 검사한다.

```bash
npm run build --prefix web
node --test research/common-errors/publication.test.mjs
```
