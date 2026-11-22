# 고난도 다학제 시험에서 LLM은 "자신이 모르는 것"을 아는가?

수능(2025–2027학년도) 1–3교시 및 2027학년도 4교시 18과목 저장 답안을 대상으로 LLM의 자발적 기권(metacognitive abstention)과 선택적 예측 성능을 분석한 실증 연구입니다. 추가 모델 호출 없이 고정 스냅샷만으로 수행했으며, 기존 데이터·답안·웹 화면은 수정하지 않았습니다.

## 주요 산출물

* [연구 보고서 (REPORT.md)](REPORT.md)
* [전체 통계 분석 결과 (outputs/analysis.json)](outputs/analysis.json)
* [독립 검증 리포트 (outputs/verification.json)](outputs/verification.json)
* [입력 스냅샷 출처 및 SHA-256 매니페스트 (inputs/manifest.json)](inputs/manifest.json)
* CSV 테이블:
  * [모델별 선택적 예측·AUROC·효용 요약 (outputs/model_summary.csv)](outputs/model_summary.csv)
  * [2027 4교시 영역별 비대칭성 (outputs/domain_asymmetry_p4.csv)](outputs/domain_asymmetry_p4.csv)
  * [2027 4교시 18과목별 오답 포착률 (outputs/subject_breakdown_p4.csv)](outputs/subject_breakdown_p4.csv)
  * [전체 기권 문항·해설·분류 코퍼스 (outputs/abstention_cases.csv)](outputs/abstention_cases.csv)
* 그림 (PNG / SVG):
  * [Fig 1. 선택적 정답률 및 오답 페널티 효용 곡선](outputs/fig1_selective_tradeoff.png)
  * [Fig 2. 2×2 영역·도표 분해 및 18과목 오답 포착률](outputs/fig2_domain_asymmetry.png)
  * [Fig 3. Leave-One-Out 동료 난이도 정합성 및 AUROC](outputs/fig3_difficulty_calibration.png)
  * [Fig 4. 기권 메커니즘 분류 및 1–3교시 독립 재현](outputs/fig4_abstention_taxonomy.png)

## 재현

저장소 루트에서 실행합니다. 분석·테스트·검증은 Python 3 표준 라이브러리만 사용하며, 그림 생성에만 `matplotlib`과 `numpy`가 필요합니다.

```bash
# 스냅샷은 inputs/에 이미 고정되어 있습니다 (재생성 시에만 snapshot.py 실행)
python3 research/metacognitive-abstention/analyze.py
python3 research/metacognitive-abstention/plot.py
python3 -m unittest discover -s research/metacognitive-abstention -p 'test_*.py' -v
python3 research/metacognitive-abstention/verify.py
```
