// Publish the frozen metacognitive-abstention research bundle. Never reads live model results or calls models.
import { copyFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const source = path.dirname(fileURLToPath(import.meta.url));
const destination = path.resolve(source, '../../web/public/research/metacognitive-abstention');
const analysis = JSON.parse(await readFile(path.join(source, 'outputs/analysis.json'), 'utf8'));

async function listFilesRecursive(baseDir, relDir) {
  const full = path.join(baseDir, relDir);
  const entries = await readdir(full, { withFileTypes: true });
  const out = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = `${relDir}/${entry.name}`;
    if (entry.isDirectory()) {
      out.push(...(await listFilesRecursive(baseDir, rel)));
    } else {
      out.push(rel);
    }
  }
  return out;
}

const topFiles = [
  'REPORT.md',
  'README.md',
  'snapshot.py',
  'analyze.py',
  'plot.py',
  'test_analyze.py',
  'verify.py',
  'publish.mjs',
  'publication.test.mjs',
];

const files = [
  ...topFiles,
  ...(await listFilesRecursive(source, 'inputs')),
  ...(await listFilesRecursive(source, 'outputs')),
];

const manifest = [];
for (const file of files) {
  const target = path.join(destination, file);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(source, file), target);
  manifest.push({
    file,
    sha256: createHash('sha256').update(await readFile(target)).digest('hex'),
  });
}

const pooled = analysis.p4_fisher_tests_pooled;
const nf = pooled.within_nonfigure_sci_vs_soc.table; // [[sci_na, sci_nw], [soc_na, soc_nw]]
const fg = pooled.within_figure_sci_vs_soc.table;    // [[sci_fa, sci_fw], [soc_fa, soc_fw]]
const pct = (a, b) => Number(((a / (a + b)) * 100).toFixed(1));

const totalPrimaryImageRuns = Object.values(analysis.panel_counts).reduce(
  (acc, p) => acc + p.primary_complete_image_runs,
  0
);

const summary = {
  title: '고난도 다학제 시험에서 LLM은 "자신이 모르는 것"을 아는가?',
  publishedAt: '2026-11-22',
  primaryImageRuns: totalPrimaryImageRuns,
  primaryAbstentions: analysis.total_abstention_instances_primary_image,
  p4Questions: analysis.panel_counts['2027:period4'].questions,
  p4PrimaryModels: analysis.panel_counts['2027:period4'].primary_complete_image_runs,
  factorial2x2: {
    socialNonFigure: { abstained: nf[1][0], wrong: nf[1][1], ecr: pct(nf[1][0], nf[1][1]) },
    socialFigure: { abstained: fg[1][0], wrong: fg[1][1], ecr: pct(fg[1][0], fg[1][1]) },
    scienceNonFigure: { abstained: nf[0][0], wrong: nf[0][1], ecr: pct(nf[0][0], nf[0][1]) },
    scienceFigure: { abstained: fg[0][0], wrong: fg[0][1], ecr: pct(fg[0][0], fg[0][1]) },
    orScienceVsSocial: pooled.science_vs_social.odds_ratio,
    pScienceVsSocial: pooled.science_vs_social.p_value,
    orNonFigureSciVsSoc: pooled.within_nonfigure_sci_vs_soc.odds_ratio,
    pNonFigureSciVsSoc: pooled.within_nonfigure_sci_vs_soc.p_value,
    orSocialFigVsNonFig: pooled.within_social_fig_vs_nonfig.odds_ratio,
    pSocialFigVsNonFig: pooled.within_social_fig_vs_nonfig.p_value,
    orScienceFigVsNonFig: pooled.within_science_fig_vs_nonfig.odds_ratio,
    pScienceFigVsNonFig: pooled.within_science_fig_vs_nonfig.p_value,
  },
  taxonomy: analysis.taxonomy_primary_image_counts,
};

const sources = [
  { id: 'S25', kind: '2025학년도 공식 수능 데이터셋 고정본 (147문항)', grade: 'A · 공식 정답 메타데이터', date: '2026-11-22', url: 'inputs/datasets/2025-ksat.json' },
  { id: 'S26', kind: '2026학년도 공식 수능 데이터셋 고정본 (147문항)', grade: 'A · 공식 정답 메타데이터', date: '2026-11-22', url: 'inputs/datasets/2026-ksat.json' },
  { id: 'S27', kind: '2027학년도 1–3교시 공식 수능 데이터셋 고정본 (147문항)', grade: 'A · 공식 정답 메타데이터', date: '2026-11-22', url: 'inputs/datasets/2027-ksat.json' },
  { id: 'S27P4', kind: '2027학년도 4교시 18과목 공식 데이터셋 고정본 (360문항)', grade: 'A · 공식 정답 메타데이터', date: '2026-11-22', url: 'inputs/datasets/2027-ksat-period4.json' },
  { id: 'SFIG', kind: '도표·지도 의존 문항(figure_dependent) 태깅 고정본', grade: 'A · 전사본 매니페스트', date: '2026-11-22', url: 'inputs/figure_dependent.json' },
  { id: 'SRUN', kind: '58개 모델 실행 답안·기권·해설 스냅샷', grade: 'A · 저장 답안 고정본', date: '2026-11-22', url: 'inputs/runs.json' },
  { id: 'SM', kind: '입력 원본 및 스냅샷 SHA-256 매니페스트', grade: 'B · 무결성 기록', date: '2026-11-22', url: 'inputs/manifest.json' },
  { id: 'SA', kind: '전체 통계 계산 결과 JSON (analysis.json)', grade: 'B · 재현 계산', date: '2026-11-22', url: 'outputs/analysis.json' },
  { id: 'SV', kind: '독립 재계산 검증 결과 (verification.json)', grade: 'B · 독립 검증', date: '2026-11-22', url: 'outputs/verification.json' },
];

const report = {
  schema_version: 1,
  title: summary.title,
  publishedAt: summary.publishedAt,
  sources,
  sections: [
    {
      id: 'c01',
      toc: '핵심 요약',
      sources: ['SA', 'SV', 'SRUN'],
      text: `## 핵심 요약

대규모 언어모델(LLM)은 자신이 모르는 질문에 직면했을 때 환각이나 추측 대신 스스로 기권(abstention)할 수 있는가? 본 연구는 KSAT AI Benchmark에 축적된 **3개 학년도(2025·2026·2027) 1–3교시(국어·수학·영어, 각 147문항)**와 **2027학년도 4교시 Closed-Book 전 과목(한국사·사회탐구 9과목·과학탐구 8과목, 총 360문항)**의 58개 정제 실행 스냅샷(주 분석 패널: 완료 이미지 모델 46개 실행, 총 187건의 자발적 기권)을 분석했다.

- **영역 비대칭성 (Known Unknowns vs. Unknown Unknowns):** 2027학년도 4교시 기권 발생 모델(8개)을 통합한 오답 포착률(ECR = 기권 / (기권 + 오답))은 과학탐구 **55.6%**(119/214)인 반면 사회탐구 **13.7%**(28/204)로 극단적 격차를 보였다(Fisher's exact test OR = 7.87, p = 1.76×10⁻¹²). 개별 모델 수준에서도 \`claude-haiku-5-5\`(OR = 15.82, p = 2.36×10⁻⁸)와 \`gpt-6-luna\`(OR = 21.06, p = 1.06×10⁻¹²)에서 강하게 재현되었다.
- **2×2 요인 분해 (도메인 × 도표 의존성):** 문항을 비도표(Non-Figure)와 도표·지도 의존(\`figure_dependent\`)으로 층화한 결과, **과학탐구는 비도표 문항에서도 ECR 53.7%(22/41)로 도표 문항(56.1%, 97/173)과 통계적 차이가 없었다**(OR = 1.10, p = 0.862). 반면 **사회탐구는 비도표 문항에서 ECR이 3.9%(4/103)로 붕괴**했지만(비도표 과탐 대비 OR = 28.66, p = 3.81×10⁻¹¹), **지도·그래프가 포함된 사회탐구 문항에서는 23.8%(24/101)로 6배 상승**했다(OR = 7.71, p = 2.86×10⁻⁵).
- **기권 메커니즘과 난이도 정합성:** 완료 이미지 실행의 전체 기권 해설 187건을 분류한 결과, **85.0%**가 **연역·계산 제약 도출 실패(82건, 43.9%)** 또는 **시각·공간 판독·대응 실패(77건, 41.2%)**였다. 순수 사실·기억 부족을 명시한 기권은 **단 3건(1.6%)**에 불과했다. 그럼에도 기권이 발생할 때는 무작위 회피가 아니라 동료 모델 기준 객관적 고난도 문항을 정확히 겨냥했다(2027 4교시 주요 기권 모델의 Leave-One-Out AUROC 0.74–0.99, 대부분 p < 0.001).
- **기권 억제 편향과 위험 민감 순위 역전:** 동일한 기권 허용 프롬프트 아래에서도 \`deepseek-v4.1-flash\`(4교시 208오답·0기권)처럼 기권이 전혀 발동하지 않는 모델군이 존재했다. 오답 페널티 λ를 도입한 효용(U(λ) = 정답률 − λ·오답률)에서는 추측 손익분기점(λ = 0.25)에서 \`gemini-4-hydrogen\`이 \`qwen4-max\`를 추월하고, 고위험 구간(λ = 4.0)에서는 원점수 10.3%p 낮았던 \`claude-haiku-5-5\`가 \`kimi-k3.1-pro\`를 역전했다.

> **결론적 가설:** 현재 LLM의 자발적 기권은 "내부 사실 지식의 결여를 스스로 성찰하는 능력"이라기보다, 풀이 과정에서 발생하는 명시적 연역·수치 제약의 충돌(STEM)과 외부 시각·도표 앵커의 판독 실패(지도·그래프)에 의해 촉발되는 **제약 기반 자기검증(Constraint-Driven Abstention)**에 가깝다. 따라서 제약 검증이 불가능한 개념·사실 회상 영역에서는 '모르는지도 모른 채 틀리는(Unknown Unknowns)' 사각지대가 구조적으로 남아 있다.`,
    },
    {
      id: 'c02',
      toc: '자료와 방법',
      sources: ['S25', 'S26', 'S27', 'S27P4', 'SFIG', 'SM'],
      text: `## 자료와 연구 방법

저장소 루트의 공식 데이터셋 4종, 전사본 \`figure_dependent\` 매니페스트 3종, 그리고 아카이브 디렉토리(\`.timeout*\`, \`.guard*\`, \`.interrupted*\` 4건)를 제외한 58개 정제 \`run.json\`을 [입력 매니페스트](inputs/manifest.json)에 동결하고 모든 원본·스냅샷 파일의 SHA-256 해시를 기록했다. 분석 스크립트(\`analyze.py\`)는 실행 시마다 스냅샷 해시를 검증하며, 추가 모델 호출이나 기존 결과·웹 파일 수정은 일절 수행하지 않았다.

| 분석 패널 | 고유 문항 | 도표 의존 문항 | 완료 이미지 실행 | 완료 텍스트 실행 | 미완료 실행 (참고) |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2025 1–3교시 | 147 | 미제공 | 9 | 0 | 0 |
| 2026 1–3교시 | 147 | 22 | 10 | 1 | 3 |
| 2027 1–3교시 | 147 | 18 | 15 | 2 | 0 |
| 2027 4교시 | 360 | 189 | 12 | 2 | 4 |

- **주 분석 패널 원칙:** 입력 양식(200 DPI 무손실 이미지 vs 텍스트 전사본)과 완료 여부의 교란을 막기 위해, 통계 검정·동료 난이도 산출·기권 해설 코퍼스 집계는 **완료된 이미지 입력 실행(46개 실행, 총 187건 기권)**을 주 분석 대상으로 삼았다. 텍스트 전사본(\`solar-pro-4\`, \`solar-mini-4-5-preview\`)과 미완료 실행(\`gemini-4-neon\` 359/360 등)은 별도로 구분해 보고한다.
- **독립 재채점 및 핵심 지표:** 공식 데이터셋의 \`correct_answer\`로 모든 답안을 독립 재채점했다(2026 영어 37번은 공식 ⑤ 기준이며, 보정 채점 감도 분석에서도 기권 건수는 변하지 않는다). 주요 지표는 선택적 정답률(A_sel = 정답 / (정답 + 오답)), 오답 포착률(ECR = 기권 / (기권 + 오답)), 오답 페널티 효용(U(λ) = (정답 − λ·오답) / N), 자기 제외 동료 정답률 기반 Mann–Whitney AUROC, 양측 Fisher's Exact Test다.`,
    },
    {
      id: 'c03',
      toc: '선택적 예측과 순위 역전',
      sources: ['S27P4', 'SRUN', 'SA'],
      text: `## 선택적 예측 성능과 위험 민감 순위 역전 (2027 4교시)

![2027학년도 4교시 모델별 전체 정답률 vs 선택적 정답률 및 오답 페널티 효용 곡선](outputs/fig1_selective_tradeoff.png)

2027학년도 4교시(360문항, 외부 검색 완전 차단) 완료 모델 14개(이미지 12개 + 텍스트 전사본 2개)의 전체 지표다. 5지선다 객관식에서 무작위 추측의 기대 효용은 0.2 − 0.8λ이므로 **λ = 0.25가 무작위 추측과 기권의 정확한 손익분기점**이다.

| 모델 | 입력 | 전체 정답률 | 선택적 정답률 | 기권 이득 | 기권 | 오답 | ECR | U(0.25) | U(1.0) | U(4.0) |
| --- | :---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| gpt-6.2-astra | image | 99.7% | 99.7% | +0.0%p | 0 | 1 | 0.0% | 0.997 | 0.994 | 0.986 |
| claude-fable-5-2 | image | 99.2% | 99.2% | +0.0%p | 0 | 3 | 0.0% | 0.990 | 0.983 | 0.958 |
| gpt-6.2-sol | image | 98.9% | 98.9% | +0.0%p | 0 | 4 | 0.0% | 0.986 | 0.978 | 0.944 |
| claude-opus-5-5 | image | 96.9% | 97.5% | +0.5%p | 2 | 9 | 18.2% | 0.963 | 0.944 | 0.869 |
| gpt-6.1-terra | image | 94.4% | 96.0% | +1.6%p | 6 | 14 | 30.0% | 0.935 | 0.906 | 0.789 |
| claude-sonnet-5-5 | image | 92.5% | 94.3% | +1.8%p | 7 | 20 | 25.9% | 0.911 | 0.869 | 0.703 |
| qwen4-max | image | 90.0% | 91.0% | +1.0%p | 4 | 32 | 11.1% | 0.878 | 0.811 | 0.544 |
| gemini-4-hydrogen | image | 89.2% | 94.1% | **+5.0%p** | 19 | 20 | **48.7%** | **0.878** | **0.836** | **0.669** |
| kimi-k3.1-pro | image | 85.6% | 86.0% | +0.5%p | 2 | 50 | 3.9% | 0.821 | 0.717 | 0.300 |
| claude-haiku-5-5 | image | 75.3% | **88.3%** | **+13.0%p** | 53 | 36 | **59.6%** | 0.728 | 0.653 | **0.353** |
| gpt-6-luna | image | 59.4% | 69.9% | **+10.5%p** | 54 | 92 | 37.0% | 0.531 | 0.339 | -0.428 |
| deepseek-v4.1-flash | image | 42.2% | 42.2% | +0.0%p | **0** | **208** | **0.0%** | 0.278 | -0.156 | -1.889 |
| solar-pro-4 (참고) | text | 80.8% | 81.1% | +0.2%p | 1 | 68 | 1.5% | 0.761 | 0.619 | 0.053 |
| solar-mini-4-5-preview (참고) | text | 71.7% | 71.7% | +0.0%p | 0 | 102 | 0.0% | 0.646 | 0.433 | -0.417 |

원점수 기준 \`qwen4-max\`(90.0%)가 \`gemini-4-hydrogen\`(89.2%)보다 높지만, 무작위 추측 손익분기점인 λ = 0.25에서 동점(0.878)이 되고 λ = 1.0부터는 \`gemini-4-hydrogen\`(0.836 vs 0.811)이 명확히 역전한다. \`claude-haiku-5-5\`는 전체 정답률 75.3%로 \`kimi-k3.1-pro\`(85.6%)보다 10.3%p 낮지만, 실패 문항의 **59.6%를 기권으로 포착**해 응답 문항 정답률이 **88.3%**로 치솟으며 고위험 구간(λ = 4.0)에서는 기대 효용에서도 \`kimi-k3.1-pro\`를 추월한다(0.353 vs 0.300). 반면 \`deepseek-v4.1-flash\`는 절반 이상(208/360)을 틀리면서도 단 한 번도 기권하지 않아 λ = 1.0에서 이미 음수 효용(-0.156), λ = 4.0에서 -1.889로 추락했다.`,
    },
    {
      id: 'c04',
      toc: '2×2 영역·도표 분해',
      sources: ['S27P4', 'SFIG', 'SA', 'SV'],
      text: `## 핵심 발견: 영역 비대칭성과 2×2 요인 분해

![2027학년도 4교시 도메인×도표 2×2 오답 포착률 분해 및 18과목별 오답 포착률](outputs/fig2_domain_asymmetry.png)

2027학년도 4교시에서 1회 이상 기권한 주 분석 이미지 모델 8개의 실패 문항(한국사 제외 418건)을 **영역(사회탐구 vs 과학탐구)**과 **시각 자료 의존성(\`figure_dependent\`)**으로 교차 분해했다.

| 영역 / 시각 의존성 | 비도표 문항 (Non-Figure) | 도표·지도 의존 (Figure) | 영역 내 도표 효과 (Fisher) |
| --- | :---: | :---: | :---: |
| 사회탐구 (9과목, 180문항) | **ECR 3.9%** (기권 4 / 오답 99) | **ECR 23.8%** (기권 24 / 오답 77) | **OR = 7.71, p = 2.86×10⁻⁵** |
| 과학탐구 (8과목, 160문항) | **ECR 53.7%** (기권 22 / 오답 19) | **ECR 56.1%** (기권 97 / 오답 76) | OR = 1.10, p = 0.862 (유의차 없음) |
| 도표 통제 후 과탐 vs 사탐 | **OR = 28.66, p = 3.81×10⁻¹¹** | **OR = 4.09, p = 1.83×10⁻⁷** | 전체: **OR = 7.87, p = 1.76×10⁻¹²** |

이 2×2 표는 "그림이 많아서 과학에서 더 기권하는 것 아닐까?"라는 단순한 설명을 반박하고 **이중 기권 메커니즘**을 드러낸다. 과학탐구에서는 그림이 없는 비도표 문항에서도 방정식·유전 서열·화학 양론 같은 형식적 연역 제약 자체가 막힘을 노출시켜 ECR 53.7%를 유지한다(도표 문항 56.1%와 유의차 없음, p = 0.862). 반면 사회탐구는 비도표 개념·역사 문항에서 103번의 실패 중 99번(96.1%)을 기권 없이 틀리지만, 지도·통계 도표가 들어가면 ECR이 3.9% → 23.8%로 6배 급등한다.

### 개별 모델별 Fisher 정확 검정

| 모델 (2027 4교시) | 과탐 (기권/오답) | 사탐 (기권/오답) | 과탐 vs 사탐 Fisher | 비도표 과탐 vs 사탐 | 사탐 내 도표 vs 비도표 |
| --- | :---: | :---: | :---: | :---: | :---: |
| gpt-6-luna | 47 / 22 (68.1%) | 7 / 69 (9.2%) | **OR = 21.06, p = 1.06×10⁻¹²** | 13/6 vs 2/41 (**p = 2.69×10⁻⁷**) | 5/28 vs 2/41 (p = 0.229) |
| claude-haiku-5-5 | 42 / 7 (85.7%) | 11 / 29 (27.5%) | **OR = 15.82, p = 2.36×10⁻⁸** | 5/1 vs 2/19 (**p = 1.44×10⁻³**) | 9/10 vs 2/19 (**p = 0.0123**) |
| gpt-6.1-terra | 6 / 7 (46.2%) | 0 / 7 (0.0%) | OR = ∞, p = 0.0515 | 1/3 vs 0/4 (p = 1.0) | 0/3 vs 0/4 |
| qwen4-max | 4 / 14 (22.2%) | 0 / 18 (0.0%) | OR = ∞, p = 0.104 | 0/1 vs 0/11 | 0/7 vs 0/11 |
| kimi-k3.1-pro | 2 / 19 (9.5%) | 0 / 30 (0.0%) | OR = ∞, p = 0.165 | 2/4 vs 0/14 (p = 0.0789) | 0/16 vs 0/14 |
| gemini-4-hydrogen | 13 / 12 (52.0%) | 6 / 8 (42.9%) | OR = 1.44, p = 0.741 | 1/0 vs 0/1 | 6/7 vs 0/1 |
| claude-sonnet-5-5 | 4 / 10 (28.6%) | 3 / 10 (23.1%) | OR = 1.33, p = 1.00 | 0/4 vs 0/6 | 3/4 vs 0/6 (p = 0.192) |
| claude-opus-5-5 | 1 / 4 (20.0%) | 1 / 5 (16.7%) | OR = 1.25, p = 1.00 | 0/0 vs 0/3 | 1/2 vs 0/3 |

18개 과목 전체를 보면 과학탐구 8과목 전부가 ECR 27.8%–51.6%로 최상위를 차지하며(\`물리학Ⅱ\` 51.6%, \`생명과학Ⅱ\` 51.3%, \`물리학Ⅰ\` 46.7%), 사회탐구 중 유일하게 이 경계에 근접한 과목은 지도·통계 비중이 18/20에 달하는 **한국지리(24.6%, 기권 17·오답 52)**뿐이었다. 반대로 **정치와 법(38오답·0기권), 세계사(34오답·0기권), 생활과 윤리(26오답·0기권), 한국사(9오답·0기권)**은 12개 모델 전체에서 기권이 단 1건도 없었다.`,
    },
    {
      id: 'c05',
      toc: '난이도 정합성',
      sources: ['S27P4', 'SRUN', 'SA'],
      text: `## 객관적 문항 난이도와의 정합성

![자기 제외 동료 모델 정답률 기준 정답·오답·기권 문항 난이도 분포 및 AUROC](outputs/fig3_difficulty_calibration.png)

모델의 기권이 실제 고난도 문항을 겨냥하는지 검증하기 위해, 자기 자신을 제외한 동료 완료 이미지 모델 11개의 평균 정답률(\`peer_acc_loo\`, 낮을수록 고난도)을 산출했다.

| 모델 (2027 4교시, 기권 ≥ 2) | 기권 수 | 정답 문항 동료정답률 | 오답 문항 동료정답률 | 기권 문항 동료정답률 | AUROC (기권 vs 정답) | AUROC (기권 vs 오답) |
| --- | ---: | ---: | ---: | ---: | :---: | :---: |
| claude-opus-5-5 | 2 | 85.4% | 46.5% | **40.9%** | **0.993** (p = 0.014) | 0.556 (p = 0.905) |
| claude-sonnet-5-5 | 7 | 86.7% | 63.2% | **46.8%** | **0.985** (p = 6.0×10⁻⁶) | **0.793** (p = 0.022) |
| qwen4-max | 4 | 86.8% | 69.6% | **50.0%** | **0.977** (p = 7.3×10⁻⁴) | 0.805 (p = 0.050) |
| gpt-6.1-terra | 6 | 85.8% | 64.3% | **53.0%** | **0.910** (p = 4.0×10⁻⁴) | 0.625 (p = 0.406) |
| gemini-4-hydrogen | 19 | 87.1% | 65.0% | 69.4% | **0.828** (p = 7.3×10⁻⁷) | 0.449 (p = 0.587) |
| claude-haiku-5-5 | 53 | 90.2% | 75.8% | **72.7%** | **0.812** (p = 8.0×10⁻¹⁴) | 0.553 (p = 0.394) |
| gpt-6-luna | 54 | 92.1% | 83.8% | **76.6%** | **0.744** (p = 5.6×10⁻⁹) | **0.598** (p = 0.044) |
| kimi-k3.1-pro | 2 | 87.8% | 69.6% | 86.4% | 0.601 (p = 0.613) | 0.170 (p = 0.114) |

\`kimi-k3.1-pro\`(2건)를 제외한 **7개 기권 모델 전부에서 기권 문항은 정답 문항보다 통계적으로 유의하게 어려웠다**(AUROC 0.744–0.993). 특히 \`claude-sonnet-5-5\`(AUROC = 0.793, p = 0.022)와 \`gpt-6-luna\`(AUROC = 0.598, p = 0.044)는 자신이 틀린 문항보다도 더 어려운 문항에서 기권을 선택했다.`,
    },
    {
      id: 'c06',
      toc: '기권 해설 분류와 사례',
      sources: ['SRUN', 'SA', 'SV'],
      text: `## 기권 해설 전수 분류 및 다중 모델 공동 기권 사례

![주 분석 완료 이미지 실행의 기권 메커니즘 전수 분류 및 1–3교시 오답 포착률 독립 재현](outputs/fig4_abstention_taxonomy.png)

주 분석 완료 이미지 실행의 기권 187건 전체(해설 존재 176건 + 해설 미기재 11건)를 규칙 기반·수작업 감사 분류기로 분류했다(미분류 잔여 0건).

| 기권 메커니즘 | 건수 | 비율 | 주요 발생 영역 |
| --- | ---: | ---: | --- |
| 연역·계산 제약 도출 실패 | **82** | **43.9%** | 과탐 II(30), 과탐 I(29), 수학(18), 사탐(5) |
| 시각·공간 판독·대응 실패 | **77** | **41.2%** | 과탐 I(28), 과탐 II(24), 사탐(21), 국어(3), 수학(1) |
| 복수 선지 소거 모호성 | **14** | **7.5%** | 국어 전량(공통 10, 언매 3, 화작 1) |
| 해설 미기재 기권 | **11** | **5.9%** | claude-haiku-5-5 전량(과탐 7, 국어 4) |
| 순수 사실·기억 부재 명시 | **3** | **1.6%** | 사탐 2(동아시아사 왕조, 한국지리 항만), 과탐 I 1 |

이 구배는 2025–2027학년도 1–3교시(완료 이미지 34개 실행)에서도 독립적으로 재현되었다. **수학 단답형(0–999) ECR 45.5%** → 수학 5지선다 25.0% → 국어 언어와 매체 13.0% → 국어 공통 9.1% → 국어 화법과 작문 3.1% → **영어 0.0%(48오답·0기권)** 순으로 형식적 검증 가능성과 일치하는 단조 감소 패턴을 보였다.

### 다중 모델 독립 공동 기권 대표 사례

- **생명과학Ⅰ 13번 (\`2027-p4-life_science1-q13\`, 3점, 도표 있음 · 6개 모델 동시 기권 · 패널 정답률 33.3%):** \`claude-haiku-5-5\`, \`claude-opus-5-5\`, \`gemini-4-hydrogen\`, \`gpt-6-luna\`, \`gpt-6.1-terra\`, \`qwen4-max\` 6개 모델이 독립 기권했다. \`gemini-4-hydrogen\`은 막전위 경과 시간과 수치 집합 사이의 모순을, \`claude-opus-5-5\`는 시냅스·막전위 그래프 판독 값에서 일관된 해를 찾을 수 없음을 명시했다.
- **생명과학Ⅱ 13번 (\`2027-p4-life_science2-q13\`, 3점, 비도표 · 4개 모델 동시 기권):** 그림이 없는 문항임에도 \`claude-haiku-5-5\`, \`gemini-4-hydrogen\`, \`gpt-6-luna\`, \`gpt-6.1-terra\`가 동시 기권하며 프라이머 수소 결합 수·염기 서열 정합성 불일치를 보고했다.
- **한국지리 5번 (\`2027-p4-korean_geography-q05\`, 3점, 도표·지도 있음 · 4개 모델 동시 기권 · 패널 정답률 50.0%):** 사탐 최다 공동 기권 문항으로, 4개 모델 모두 수도권 지역군 음영 지도와 통근·통학 그래프의 대응 불확실성을 기권 사유로 제시했다.`,
    },
    {
      id: 'c07',
      toc: '종단 일관성',
      sources: ['S25', 'S26', 'S27', 'S27P4', 'SA'],
      text: `## 종단 일관성: 연도(2025→2027) 및 교시(1–3교시→4교시) 변화

동일 모델의 다개년·다교시 실행 기록을 추적하면 **기권 성향은 안정적인 모델 고유 특성(trait)**이면서 동시에 **Closed-Book 지식 부하(4교시)에서 급격히 증폭**된다.

- **일관된 고기권 모델:** \`claude-haiku-5-5\`는 2025 1–3교시(기권 5·오답 10, ECR 33.3%) → 2026(기권 10·오답 8, 55.6%) → 2027 1–3교시(기권 6·오답 6, 50.0%) → **2027 4교시(기권 53·오답 36, 59.6%)**까지 4개 시험 전부에서 일관되게 높은 오답 포착률을 유지했다. \`gpt-6-luna\` 역시 2025(5) → 2026(2) → 2027 1–3교시(4) → 2027 4교시(54)로 확장되었다.
- **상위권 모델의 4교시 기권 발현:** 1–3교시 3개년 동안 기권 0회였던 \`claude-opus-5-5\`(4교시 2건), \`claude-sonnet-5-5\`(7건), \`gemini-4-hydrogen\`(19건), \`qwen4-max\`(4건)는 모두 2027 4교시에서 비로소 기권을 발동했다. 반면 99%대 초고득점 모델(\`gpt-6.2-astra\`, \`claude-fable-5-2\`, \`gpt-6.2-sol\`)은 기권 0회를 유지했다.
- **지속적 무기권 모델:** \`deepseek-v4.1-flash\`는 2026 1–3교시(기권 3·오답 36) → 2027 1–3교시(기권 2·오답 44) → 2027 4교시(**기권 0·오답 208**)로, 오답이 폭증한 4교시에서 오히려 기권이 0으로 수렴했다.`,
    },
    {
      id: 'c08',
      toc: '한계와 후속 실험',
      sources: ['SM', 'SA', 'SV'],
      text: `## 한계, 교란 요인 및 후속 통제 실험 설계

본 연구는 저장 답안에 대한 관찰 연구로서 다음 한계를 분명히 둔다.

- **통합(Pooled) 검정의 비독립성:** 8개 모델 × 340문항 통합 분할표는 동일 문항과 동일 모델을 공유하므로 독립 표본 가정에 어긋난다. 통합 p-값은 개별 모델 Fisher 검정(\`gpt-6-luna\`, \`claude-haiku-5-5\`)의 방향성과 함께 해석해야 한다.
- **추론 강도·실행 경로 비동일성:** 공급자별 SDK/CLI, 토크나이저, 추론 예산, 프롬프트 버전(2025·2026 v1 vs 2027 v2)이 완전히 동일하지 않으므로 모델 간 기권률 차이를 단일 요인으로 환원할 수 없다.
- **사후 정당화(Post-hoc Rationalization) 가능성:** \`explanation\`은 모델의 사후 서술이므로 내부 불확실성 상태와 100% 일치한다고 단정할 수 없다. 다만 비도표 과탐 vs 비도표 사탐의 28.7배 기권 격차라는 행동적 증거가 텍스트 분류 결과와 독립적으로 일치한다.
- **과잉 기권(Over-abstention) 미분리:** 관찰 데이터만으로는 기권 문항을 강제로 풀게 했을 때의 반사실적 정답률(counterfactual accuracy)을 직접 관측할 수 없다.

### 후속 대조 실험 설계

1. **Counterfactual Forced-Guessing Ablation:** 2027 4교시 기권 문항 126건(\`claude-haiku-5-5\` 53건, \`gpt-6-luna\` 54건, \`gemini-4-hydrogen\` 19건)만 대상으로 "기권 금지, 반드시 1–5 중 택1" 조건을 별도 격리 경로에서 실행해, 강제 응답 정답률이 우연 수준(20–35%, 진정한 메타인지)인지 고득점(65%+, 과잉 보수성)인지 직접 판별한다.
2. **Explicit Penalty-Prompt Sensitivity:** \`deepseek-v4.1-flash\` 등 무기권 모델에 명시적 감점 규칙(정답 +1, 기권 0, 오답 −3)을 부여했을 때 잠재적 기권 능력이 깨어나는지 검증한다.`,
    },
  ],
};

await writeFile(path.join(destination, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
await writeFile(path.join(destination, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
await writeFile(path.join(destination, 'files.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(
  `Published frozen metacognitive-abstention bundle: ${files.length} files, ${report.sections.length} sections`
);
