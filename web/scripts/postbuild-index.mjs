// 정적 빌드 결과에서 `2026.html` 과 `2026/` 폴더가 함께 있으면, 정적 호스팅이 `/2026` 요청을
// 폴더로 보내 index.html 을 찾다가 404를 낼 수 있다. 같은 내용을 `2026/index.html` 로도 둔다.
import { copyFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const out = new URL('../out/', import.meta.url).pathname;
let copied = 0;
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '_next') continue;
      const page = `${full}.html`;
      const index = join(full, 'index.html');
      if (existsSync(page) && !existsSync(index)) { copyFileSync(page, index); copied += 1; }
      walk(full);
    }
  }
}
if (existsSync(out)) walk(out);
console.log(`postbuild-index: ${copied} index.html 복사`);
