export function RobocoBrand() {
  const basePath = process.env.NODE_ENV === 'production' ? '/KSAT-AI-Benchmark' : '';
  return <a className="brand" href={`${basePath}/`} aria-label="로보코 수능 AI 평가 홈">
    <img className="brand-logo" src={`${basePath}/images/roboco-logo.svg`} width={78} height={60} alt="ROBOCO 로보코" />
    <span>수능 AI 평가</span>
  </a>;
}
