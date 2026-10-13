import type { Metadata } from 'next';
import raw from '@/public/data/english-q37-debate.json';
import comparison from '@/public/data/benchmark-comparison.json';
import type { BenchmarkComparison } from '@/components/benchmark-types';
import { questionNotes } from '@/lib/question-notes';
import { formatKst } from '@/lib/format-date.mjs';

export const metadata: Metadata = {
  title: '영어 37번 정답 토론 · Fable × Astra | KSAT AI Benchmark',
  description: '2026학년도 수능 영어 37번의 ④·⑤번을 Fable과 Astra가 독립 검토하고 상호 반박한 실제 AI 토론 기록입니다.',
  openGraph: { url: 'https://roboco.io/KSAT-AI-Benchmark/debates/english-q37.html', title: '영어 37번, ④번인가 ⑤번인가? Fable × Astra 토론', description: '독립 판단, 상호 반박, 최종 판단과 토론 원문을 공개합니다.' },
};

type Response = { preferred_answer: 4 | 5 | null; verdict: string; statement: string; evidence: string[]; counterargument: string; change: string; confidence: number };
type Participant = { model: string; agent: string; status: string; response?: Response; elapsed_seconds?: number; estimated_cost_usd?: number; usage?: { input_tokens: number; output_tokens: number } };
type Debate = { completed: boolean; started_at: string; finished_at?: string; protocol: { image_sha256: string }; rounds: { number: number; stage: string; participants: Participant[] }[]; context_added_after_debate?: { previous_exam_answers: { model: string; answer: number; explanation: string; source: string }[] } };
const data = raw as Debate;
const models = [{ id: 'claude-fable-5-1', label: 'Claude Fable 5.1' }, { id: 'gpt-6-astra', label: 'GPT-6 Astra' }];
const verdicts: Record<string, string> = { single_4: '④번 단일정답', single_5: '⑤번 단일정답', both_plausible: '두 배열 모두 성립 가능', undetermined: '판단 유보' };
const choices: Record<number, string> = { 1: '① (A → C → B)', 2: '② (B → A → C)', 3: '③ (B → C → A)', 4: '④ (C → A → B)', 5: '⑤ (C → B → A)' };
const choice = (value: number | null | undefined) => value ? choices[value] || `${value}번` : '선호 답 유보';
const existingResults = comparison as BenchmarkComparison;
const otherAnswers = existingResults.requested_models.filter(model => !models.some(participant => participant.id === model.id)).map(model => ({
  model,
  question: existingResults.models.find(result => result.model === model.id)?.questions.find(question => question.id === '2026-english-english-q37'),
}));
const answerCounts = Object.entries(choices).map(([answer, label]) => ({ label, count: otherAnswers.filter(entry => entry.question?.answer === Number(answer)).length })).filter(entry => entry.count > 0);
const gradingLabels = { correct: '정답', incorrect: '오답', abstained: '기권', error: '실행 오류', pending: '미제출' };
const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
const sources = questionNotes['2026-english-english-q37'].sources;

export default function DebatePage() {
  const final = data.rounds.find(round => round.number === 3);
  return <div className="benchmark-shell debate-shell">
    <a className="skip-link" href="#debate-conclusion">토론 결론으로 이동</a>
    <header className="site-header"><a className="brand" href={`${basePath}/`}>roboco<span>수능 AI 평가</span></a><nav aria-label="주요 메뉴"><a href={`${basePath}/`}>모델 성적표</a><a href="#debate-transcript">발언 원문</a><a className="download" href={`${basePath}/data/english-q37-debate.json`} download>토론 JSON 다운로드</a></nav></header>
    <main>
      <section className="report-heading"><div><p className="year-label">2026학년도 수능 영어 37번 · 사후 검토</p><h1>④번인가, ⑤번인가?</h1><p className="intro">Fable과 Astra가 문장 연결을 독립적으로 검토하고 서로의 논거를 반박했습니다.</p></div><div className="report-stamp"><strong>실제 AI 토론 기록</strong><span>{formatKst(data.finished_at || data.started_at)} (KST)</span><span>독립 판단 → 상호 반박 → 최종 판단</span></div></section>
      <section id="debate-conclusion" className="debate-section" aria-labelledby="conclusion-heading"><h2 id="conclusion-heading">최종 판단</h2>
        <p className="debate-summary">{data.completed ? '최종 선호는 Fable ⑤번, Astra ④번으로 갈렸습니다. 두 모델 모두 두 배열이 성립할 수 있으며, 본문만으로 단일정답을 확정할 근거가 충분하지 않다고 판단했습니다. 특정 답 하나에 대한 합의나 출제 오류 확정은 아닙니다.' : '토론이 아직 완료되지 않았습니다. 최종 판단을 확정하지 않습니다.'}</p>
        <div className="debate-verdicts">{models.map(model => {
          const response = final?.participants.find(participant => participant.model === model.id)?.response;
          return <article key={model.id}><h3>{model.label}</h3><p className="debate-choice">{choice(response?.preferred_answer)}</p><p>{response ? verdicts[response.verdict] : '실행 중'}</p><small>확신 {response?.confidence ?? '—'} / 100 · 모델의 자기평가</small></article>;
        })}</div>
        <h3>토론을 통해 확인한 점</h3><ul><li><strong>공통 근거:</strong> C의 비경험적 접근과 A의 경험적 보완은 직접 대응합니다. C-B의 연구 접근 연결과 B-A의 협력 요구를 풀어 설명하는 연결도 가능합니다.</li><li><strong>Fable의 변화:</strong> 초기에는 C-A의 강한 연결로 ④번을 단일정답으로 판단했습니다. 최종적으로 A-B의 전개가 되돌아가는 점과 ⑤번의 두 연결을 함께 고려해 ⑤번을 근소하게 선호하는 쪽으로 바꿨습니다.</li><li><strong>Astra의 유보:</strong> C-A의 직접성 때문에 ④번을 선호하지만, “This means”가 앞선 요구의 함의를 설명할 수도 있다는 점에서 ⑤번을 배제할 수 없다고 봤습니다.</li><li><strong>남은 이견:</strong> 국소 어휘 연결과 글 전체의 설명·종합 구조 중 무엇에 더 무게를 둘지에 따라 선호가 달라졌습니다.</li></ul>
        <div className="question-note"><h3>공식 채점과 AI 판단의 구분</h3><p>평가원은 2025년 11월 25일 37번을 “정답에 이상 없음”으로 판정했고, 공식 정답은 ⑤번입니다. 공개 답변자료에는 37번의 별도 설명이 없습니다. 이 토론은 공식 판정을 대체하지 않으며 기존 점수와 순위를 변경하지 않습니다.</p><p>기관의 이해관계에 대한 의문과 해당 문항의 논리적 타당성은 구분해서 검토해야 합니다. 두 AI의 합의만으로 객관성이나 출제 오류가 입증되지는 않습니다.</p></div>
      </section>
      <section className="debate-section" aria-labelledby="issue-heading"><h2 id="issue-heading">무엇이 쟁점인가?</h2><p>(A)의 “This means that”이 받는 내용과 문단의 일반화·구체화 방향이 쟁점입니다.</p><dl className="debate-issues"><div><dt>④ (C → A → B)</dt><dd>철학의 비경험적 방법 → 경험적 연구로 보완할 필요 → 신경과학과 협력할 필요</dd></div><div><dt>⑤ (C → B → A)</dt><dd>철학의 방법과 학제 간 역할 → 의식 연구에서의 역할·협력 → 경험적 보완 필요성으로 종합</dd></div></dl><p>문항은 단순히 가능한 배열이 아니라 “가장 적절한” 순서를 묻습니다. 어느 배열이 자연스러운지와 경쟁 배열을 배제할 근거가 충분한지를 함께 검토했습니다.</p><p><a href={`${basePath}/images/english-q37-debate-input.webp`} target="_blank" rel="noreferrer">두 모델에 제공한 원본 문제지 이미지 보기 · 홀수형 7쪽 ↗</a></p></section>
      <section className="debate-section" aria-labelledby="trajectory-heading"><h2 id="trajectory-heading">단계별 판단 변화</h2><div className="debate-table-wrap"><table className="debate-table"><thead><tr><th scope="col">단계</th>{models.map(model => <th scope="col" key={model.id}>{model.label}</th>)}</tr></thead><tbody>{data.rounds.map(round => <tr key={round.number}><th scope="row">{round.number}. {round.stage}</th>{models.map(model => { const response = round.participants.find(participant => participant.model === model.id)?.response; return <td key={model.id}>{choice(response?.preferred_answer)}<small>{response ? verdicts[response.verdict] : '실행 중'}</small></td>; })}</tr>)}</tbody></table></div></section>
      <section id="debate-transcript" className="debate-section" aria-labelledby="transcript-heading"><h2 id="transcript-heading">토론 발언 원문</h2><p>공개 논증을 그대로 표시합니다. 비공개 내부 추론은 요청하거나 게시하지 않았습니다. 전체 입력 지시와 응답은 토론 JSON에 보존했습니다.</p>{data.rounds.map(round => <section className="debate-round" key={round.number}><h3>{round.number}. {round.stage}</h3>{models.map(model => {
        const response = round.participants.find(participant => participant.model === model.id)?.response;
        return response && <details className="debate-statement" key={model.id} open={round.number === 3}><summary>{model.label}<span>{choice(response.preferred_answer)}</span></summary><div><p className="explanation">{response.statement}</p><h4>본문 근거</h4><ul>{response.evidence.map((evidence, index) => <li key={index}>{evidence}</li>)}</ul><h4>가장 강한 반론과 답변</h4><p className="explanation">{response.counterargument}</p><h4>판단 변화</h4><p className="explanation">{response.change}</p><p className="debate-confidence">확신: {response.confidence} / 100 · 검증된 확률이 아닌 모델 자기평가</p></div></details>;
      })}</section>)}</section>
      <section className="debate-section" aria-labelledby="baseline-heading"><h2 id="baseline-heading">원래 시험 답안과의 차이</h2><p>원래 시험에서는 Fable이 ④번, Astra가 ⑤번을 제출했습니다. 새 토론의 최종 선호는 각각 ⑤번과 ④번으로 바뀌었습니다. 이 기록은 모델의 판단이 일관되게 고정되지 않았음을 보여줍니다. 입력 맥락과 검토 방식이 다르므로 조건 차이도 결과 해석에 포함해야 합니다. 이 기존 답안 정보는 토론 종료 후에만 추가했습니다.</p><ul>{data.context_added_after_debate?.previous_exam_answers.map(answer => <li key={answer.model}><a href={`https://github.com/roboco-io/KSAT-AI-Benchmark/blob/main/${answer.source}`} target="_blank" rel="noreferrer">{models.find(model => model.id === answer.model)?.label}의 기존 제출 답안 {answer.answer}번 ↗</a><p className="explanation">{answer.explanation}</p></li>)}</ul></section>
      <section id="other-model-answers" className="debate-section" aria-labelledby="other-models-heading"><h2 id="other-models-heading">다른 모델의 기존 답안과 근거</h2><p>Fable·Astra를 제외한 {otherAnswers.length}개 모델이 원래 시험에서 제출한 영어 37번 답안과 설명을 그대로 모았습니다. 새 토론 발언이 아니며, 두 토론 모델의 입력에도 제공하지 않았습니다.</p><p><strong>제출 답안 분포:</strong> {answerCounts.map(entry => `${entry.label} ${entry.count}개`).join(' · ')}. 이 분포는 정답을 결정하는 다수결이 아닙니다.</p><div className="debate-table-wrap"><table className="debate-table other-model-table"><caption className="sr-only">다른 모델의 기존 영어 37번 제출 답안, 공식 채점과 원문 풀이</caption><thead><tr><th scope="col">모델</th><th scope="col">제출 답안</th><th scope="col">공식 채점</th><th scope="col">제출 근거 원문</th></tr></thead><tbody>{otherAnswers.map(({model, question}) => <tr key={model.id}><th scope="row">{model.label}{model.state === 'partial' && <small>전체 시험 불완전 · 이 문항은 {question?.answer !== null && question?.answer !== undefined ? '제출 완료' : '미제출'}</small>}</th><td data-label="제출 답안">{question?.answer !== null && question?.answer !== undefined ? choice(question.answer) : '답안 없음'}</td><td data-label="공식 채점">{gradingLabels[question?.status || 'pending']}</td><td data-label="제출 근거 원문">{question && ['correct', 'incorrect', 'abstained'].includes(question.status) ? question.explanation || '기록된 설명 없음' : '제출된 풀이 없음'}</td></tr>)}</tbody></table></div><p><a href={`${basePath}/data/benchmark-comparison.json`} download>기존 수험 답안·근거 전체 JSON 다운로드</a> · 공식 정답 ⑤번을 기준으로 한 채점입니다.</p></section>
      <section className="debate-section" aria-labelledby="method-heading"><h2 id="method-heading">토론 조건과 한계</h2><ul><li>Fable은 Claude Agent SDK, Astra는 Codex SDK의 지정 모델로 실행했습니다. API 키나 유료 대체 모델을 사용하지 않았습니다.</li><li>두 모델에 동일한 원본 문제지 7쪽의 200 DPI 무손실 이미지를 제공했습니다. 37번만 분석하도록 지시했습니다.</li><li>초기 판단에는 공식 정답, 기존 모델 답안, 논쟁 기사를 제공하지 않았습니다. 모델이 학습 과정에서 문제나 정답을 접했을 가능성은 배제할 수 없습니다.</li><li>각 발언은 새 격리 세션에서 생성했습니다. 2단계부터는 앞선 두 모델의 발언 원문 전체를 동일하게 제공했습니다.</li><li>검색과 외부 도구는 비활성화했습니다. 특정 답을 옹호하는 역할을 부여하지 않았으며, 반론 수용과 판단 변경을 허용했습니다.</li><li>모델별 high 설정의 내부 계산량은 동일하다고 볼 수 없습니다. 한 번의 토론이며 사람 전문가의 독립 검증을 대신하지 않습니다.</li><li>원문 문장 연결만 검토한 사후 토론입니다. 원래 수능 평가와 입력 맥락·목적이 다르므로 새 벤치마크 점수로 집계하지 않습니다.</li></ul><details className="debate-statement"><summary>실행·사용량 기록</summary><div>{models.map(model => {
        const turns = data.rounds.flatMap(round => round.participants).filter(participant => participant.model === model.id);
        return <p key={model.id}>{model.label}: {turns.filter(turn => turn.status === 'completed').length}회 발언 · 입력 {turns.reduce((sum, turn) => sum + (turn.usage?.input_tokens || 0), 0).toLocaleString('ko-KR')}토큰 · 출력 {turns.reduce((sum, turn) => sum + (turn.usage?.output_tokens || 0), 0).toLocaleString('ko-KR')}토큰 · API 환산 참고 비용 ${turns.reduce((sum, turn) => sum + (turn.estimated_cost_usd || 0), 0).toFixed(4)} (실측 청구액이 아님)</p>;
      })}<p>시간·토큰·입력 해시는 다운로드 JSON에서 확인할 수 있습니다. 제공자가 별도 보고하지 않은 사고 토큰은 추정하지 않습니다.</p><p className="question-id">입력 이미지 SHA-256: {data.protocol.image_sha256}</p></div></details></section>
      <section className="debate-section" aria-labelledby="sources-heading"><h2 id="sources-heading">문제와 논쟁의 근거 자료</h2><ul><li><a href="https://www.suneung.re.kr/boardCnts/view.do?boardID=1500234&boardSeq=5093799&lev=0&m=0403&s=suneung" target="_blank" rel="noreferrer">평가원 공식 영어 문제지·정답표 · 홀수형 7쪽 37번 ↗</a></li>{sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.label} ↗</a></li>)}</ul><p>이 자료들은 독자의 대조를 위해 연결했습니다. AI 토론 입력에는 포함하지 않았습니다.</p></section>
    </main><footer><span>roboco · KSAT AI Benchmark</span><a href={`${basePath}/`}>모델 성적표로 돌아가기</a></footer>
  </div>;
}
