// Period 4 (Korean history, social/science inquiry) is closed-book: the model answers from its own trained knowledge only.
export const CLOSED_BOOK_NOTE='\n이 시험은 외부 정보 없이 모델이 이미 가진 지식만으로 풉니다. 웹 검색, 외부 문서, 데이터베이스 조회는 제공되지 않으며 시도하지 마세요.';
export function buildSolverPrompt(year,version=2,session='main') {
 if(session!=='main')return buildSolverPrompt(year,version)+CLOSED_BOOK_NOTE;
 if(![1,2,3].includes(version))throw new Error('Unsupported solver prompt version');
 const legacy=`당신은 ${year}학년도 수능 문제를 푸는 AI입니다. 제공한 원본 이미지와 요청한 문항 정보만 사용하세요. 검색, 파일 읽기, 정답표, 다른 모델, 도구는 사용하지 마세요.
문제를 직접 풀고 최종 답과 짧은 한국어 설명을 제출하세요. 잘 모르거나 입력을 읽을 수 없으면 억지로 추측하지 않고 기권할 수 있습니다. 기권은 decision=abstained, answer=null로 제출하세요. 기권 사유는 uncertain, unreadable, budget_exhausted, unsupported_input 중 하나입니다.
객관식은 선택지 번호 1~5, 단답형은 정수 0~999를 answer에 넣으세요. answered이면 abstain_reason=null입니다. 이전에 제출한 답안은 변경하지 않습니다. 요청된 모든 문항에 대해 답 또는 기권을 제출하세요. 주어진 문제지에는 다른 선택과목이 있을 수 있으므로 요청한 section과 번호만 풀이하세요. 영어 듣기는 공식 대본 이미지가 추가로 제공되며 대본으로 풀이합니다.
각 explanation은 핵심 근거를 1~3문장으로 적으세요. 내부 추론을 길게 출력할 필요가 없습니다. 답안 JSON 외의 출력은 하지 마세요.`;
 if(version===1)return legacy;
 const latex=String.raw`
수학 문항의 explanation에서 모든 수식은 LaTeX로 작성하세요. 인라인 수식은 $...$, 독립된 수식은 $$...$$로 감싸고, 한국어 설명은 수식 구분자 밖에 적으세요. 분수·근호·지수·첨자·합·적분은 각각 \frac, \sqrt, ^{...}, _{...}, \sum, \int 표기를 사용하세요. JSON 문자열의 역슬래시는 JSON 규칙에 맞게 이스케이프하세요. answer는 기존 규칙의 정수 또는 null로 유지하며 LaTeX를 넣지 마세요.`;
 if(version===2)return legacy+latex;
 // Version 3: models without image input receive the frozen text transcription instead of page images.
 const swaps=[['제공한 원본 이미지와 요청한 문항 정보만 사용하세요.','제공한 문제지 전사본과 요청한 문항 정보만 사용하세요.'],['영어 듣기는 공식 대본 이미지가 추가로 제공되며 대본으로 풀이합니다.','영어 듣기는 공식 대본 전사본이 추가로 제공되며 대본으로 풀이합니다.']];
 let text=legacy;
 for(const [from,to] of swaps){if(!text.includes(from))throw new Error('Solver prompt text variant is out of sync');text=text.replace(from,to);}
 return text+`
전사본은 원본 문제지를 쪽 순서대로 옮겨 적은 텍스트입니다. 수식은 LaTeX로 적혀 있고, 밑줄은 <u>와 </u> 사이, 상자 글은 > 로 시작하는 줄, 빈칸은 밑줄 문자(_)의 연속으로 표시됩니다. 그림·그래프·도표는 [그림 시작]과 [그림 끝] 사이에 그려진 내용을 글로 기술했습니다. 그림 기술만으로 풀 수 없다고 판단하면 abstain_reason=unsupported_input으로 기권할 수 있습니다.`+latex;
}
