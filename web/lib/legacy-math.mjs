import katex from 'katex';

const tokens = /[A-Za-z0-9α-ωΑ-Ω∑Σ∫∞√∛×÷·−–±≤≥≠≈→⇒⇔∈∉∪∩∅πθ²³⁰¹⁴⁵⁶⁷⁸⁹⁻⁺ⁿⁱ₀-₉ₙᵃᵇᶜᵈᵉᵏᵐˣʸᶻ\\+\-*/=^_{}()[\]|<>'′’″,.:! \t]+/g;
const functions = new Set(['sin','cos','tan','cot','sec','csc','log','ln','lim','exp','max','min','Pr','Var','arcsin','arccos','arctan']);
const symbols = {'×':'\\times ','÷':'\\div ','·':'\\cdot ','−':'-','–':'-','±':'\\pm ','≤':'\\le ','≥':'\\ge ','≠':'\\ne ','≈':'\\approx ','→':'\\to ','⇒':'\\Rightarrow ','⇔':'\\Leftrightarrow ','∑':'\\sum ','Σ':'\\sum ','∫':'\\int ','∞':'\\infty ','∈':'\\in ','∉':'\\notin ','∪':'\\cup ','∩':'\\cap ','∅':'\\emptyset ','π':'\\pi ','θ':'\\theta '};
const scripts = {'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+','ⁿ':'n','ⁱ':'i','₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9','ₙ':'n','ᵃ':'a','ᵇ':'b','ᶜ':'c','ᵈ':'d','ᵉ':'e','ᵏ':'k','ᵐ':'m','ˣ':'x','ʸ':'y','ᶻ':'z'};

function balanced(text) {
 const stack=[];const closing={')':'(',']':'[','}':'{'};
 for(const c of text) {if('([{'.includes(c))stack.push(c);else if(closing[c]&&stack.pop()!==closing[c])return false;}
 return !stack.length;
}
function groupedEnd(text,start) {
 let depth=0;
 for(let i=start;i<text.length;i++){if(text[i]==='(')depth++;if(text[i]===')'&&!--depth)return i;}
 return -1;
}
function latex(source) {
 let value=source.replace(/[′’]/g,"'").replace(/″/g,"''");
 value=value.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿⁱᵃᵇᶜᵈᵉᵏᵐˣʸᶻ]+/g,s=>`^{${[...s].map(c=>scripts[c]).join('')}}`).replace(/[₀-₉ₙ]+/g,s=>`_{${[...s].map(c=>scripts[c]).join('')}}`);
 for(let i=0;i<value.length;i++)if('^_'.includes(value[i])&&value[i+1]==='('){const end=groupedEnd(value,i+1);if(end<0)return null;value=value.slice(0,i+1)+'{'+value.slice(i+2,end)+'}'+value.slice(end+1);}
 value=value.replace(/([\^_])([+-]?\d{2,}(?:\.\d+)?|[+-]\d+(?:\.\d+)?|\d+\.\d+)/g,'$1{$2}');
 for(let i=0;i<value.length;i++)if('√∛'.includes(value[i])) {
  const root=value[i];let end,atom;
  if(value[i+1]==='('){end=groupedEnd(value,i+1);if(end<0)return null;atom=value.slice(i+2,end);}
  else {const match=value.slice(i+1).match(/^(?:\d+(?:\.\d+)?|[A-Za-z])/);if(!match)return null;atom=match[0];end=i+atom.length;if(/[\p{L}\^_(]/u.test(value[end+1]||'~'))return null;}
  value=value.slice(0,i)+`\\sqrt${root==='∛'?'[3]':''}{${atom}}`+value.slice(end+1);
 }
 value=value.replace(/(?<![\w.,^])(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(?![\w.^!]|,\d)/g,'\\frac{$1}{$2}');
 value=value.replace(/[×÷·−–±≤≥≠≈→⇒⇔∑Σ∫∞∈∉∪∩∅πθ]/g,c=>symbols[c]);
 value=value.replace(/(?<![A-Za-z\\])(arcsin|arccos|arctan|sin|cos|tan|cot|sec|csc|log|ln|lim|exp|max|min)(?![A-Za-z])/g,word=>`\\${word} `);
 return value;
}
function plain(text) {
 return text.replace(tokens,match=>{
  const expression=match.trim().replace(/^[.,:]\s+/,'').replace(/[.,:]+$/,'');
  if(!/[A-Za-z0-9α-ωΑ-Ω]/.test(expression)||expression.length>1000||!balanced(expression))return match;
  const words=expression.replace(/\\[A-Za-z]+/g,'').match(/[A-Za-z]{3,}/g)||[];
  if(words.some(word=>!functions.has(word)&&!/^\p{Lu}+$/u.test(word)))return match;
  const formatted=latex(expression);if(!formatted)return match;
  try{katex.renderToString(formatted,{throwOnError:true,trust:false,strict:'ignore',maxExpand:1000,maxSize:20});}catch{return match;}
  const start=match.indexOf(expression);
  return match.slice(0,start)+'$'+formatted+'$'+match.slice(start+expression.length);
 });
}

/** Display-only, conservative conversion. Stored answers and reasoning remain untouched. */
export function normalizeLegacyMath(text) {
 if(/<\/?[a-z][^>]*>/i.test(text))return text;
 const delimiters=[['$$','$$'],['\\[','\\]'],['\\(','\\)'],['$','$']];
 let output='',start=0;
 for(let i=0;i<text.length;i++) {
  const delimiter=delimiters.find(([left])=>text.startsWith(left,i));
  if(!delimiter){if(text[i]==='\\')i++;continue;}
  let end=-1;
  for(let j=i+delimiter[0].length;j<text.length;j++) {if(text.startsWith(delimiter[1],j)){end=j+delimiter[1].length;break;}if(text[j]==='\\')j++;}
  if(end<0)return output+plain(text.slice(start,i))+text.slice(i);
  output+=plain(text.slice(start,i))+text.slice(i,end);start=end;i=end-1;
 }
 return output+plain(text.slice(start));
}
