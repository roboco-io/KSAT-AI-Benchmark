import { Fragment, type ReactNode } from 'react';

// The report uses only headings, paragraphs, tables and images. React escapes
// all prose; no HTML from the research bundle is injected into the page.
function inline(text: string, assetRoot: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const tokens = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g;
  let start = 0;
  for (const match of text.matchAll(tokens)) {
    const index = match.index!;
    parts.push(text.slice(start, index));
    if (match[1]) {
      const url = match[2];
      const href = /^https:\/\//.test(url) || url.startsWith('#') ? url : `${assetRoot}/${url}`;
      parts.push(<a key={index} href={href}>{match[1]}</a>);
    } else if (match[3]) parts.push(<code key={index}>{match[3]}</code>);
    else parts.push(<strong key={index}>{match[4]}</strong>);
    start = index + match[0].length;
  }
  parts.push(text.slice(start));
  return parts;
}

export function ResearchContent({ text, assetRoot, sectionId }: { text: string; assetRoot: string; sectionId: string }) {
  const blocks = text.split(/\n\s*\n/);
  return <>{blocks.map((block, index) => {
    if (block.startsWith('## ')) return <h2 id={sectionId} key={index}>{block.slice(3)}</h2>;
    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(block);
    if (image) return <figure key={index}><a href={`${assetRoot}/${image[2]}`}><img src={`${assetRoot}/${image[2]}`} alt={image[1]} loading="lazy" /></a><figcaption>{image[1]} · 이미지를 선택하면 원본 크기로 볼 수 있습니다.</figcaption></figure>;
    if (block.startsWith('|')) {
      const rows = block.split('\n').filter(line => !/^\|[\s:|-]+\|$/.test(line)).map(line => line.slice(1, -1).split('|').map(cell => cell.trim()));
      return <div className="research-table-wrap" key={index}><table><thead><tr>{rows[0].map((cell, i) => <th scope="col" key={i}>{inline(cell, assetRoot)}</th>)}</tr></thead><tbody>{rows.slice(1).map((row, i) => <tr key={i}>{row.map((cell, j) => j === 0 ? <th scope="row" key={j}>{inline(cell, assetRoot)}</th> : <td key={j}>{inline(cell, assetRoot)}</td>)}</tr>)}</tbody></table></div>;
    }
    return <Fragment key={index}><p>{inline(block, assetRoot)}</p></Fragment>;
  })}</>;
}
