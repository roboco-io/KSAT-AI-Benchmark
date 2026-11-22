const SUBJECTS=['korean','math','english','korean_history','social','science'];
const METRICS=['score','accuracy','cost','wall','costPerPoint','secPerQuestion','abstention','errors','tokens','fAccuracy','fPoints',...SUBJECTS.map(s=>`subj:${s}`)];
const KINDS=['multiple_choice','short_answer'];
const MAX_COLS=8, MAX_PICKED=50, MAX_ID=200;

const freeze=o=>{for(const v of Object.values(o)) if(v&&typeof v==='object') freeze(v); return Object.freeze(o);};

export const DEFAULT_EXPLORE=freeze({x:'cost',y:'score',sort:'score',asc:false,cols:['score','cost','wall'],providers:[],engines:[],maxCost:null,picked:[],open:null,q:{subjects:[],minPoints:null,kind:null,minMissShare:null}});

const D=DEFAULT_EXPLORE;
const clone=()=>({...D,cols:[...D.cols],providers:[],engines:[],picked:[],q:{...D.q,subjects:[]}});

const dec=v=>{try{return decodeURIComponent(v.replace(/\+/g,'%2B'));}catch{return null;}};
const metric=v=>METRICS.includes(v)?v:null;
const num=(v,max=Infinity)=>{
 if(typeof v!=='string'||v.trim()==='') return null;
 const n=Number(v);
 return Number.isFinite(n)&&n>=0&&n<=max?n:null;
};
const list=(raw,cap)=>{
 const out=[];
 for(const part of raw.split(',')){
  const v=dec(part);
  if(v&&v.length<=MAX_ID&&!out.includes(v)) out.push(v);
  if(out.length>=cap) break;
 }
 return out;
};
const metricList=raw=>{
 const out=[];
 for(const v of list(raw,Infinity)) if(metric(v)&&out.length<MAX_COLS) out.push(v);
 return out;
};

export function parseExplore(search){
 const s=clone();
 if(typeof search!=='string') return s;
 const raw=Object.create(null);
 for(const pair of search.replace(/^\?/,'').split('&')){
  if(!pair) continue;
  const i=pair.indexOf('=');
  const k=i<0?pair:pair.slice(0,i);
  if(!(k in raw)) raw[k]=i<0?'':pair.slice(i+1);
 }
 const val=k=>(k in raw?dec(raw[k]):null);
 for(const k of ['x','y','sort']){const m=metric(val(k)); if(m) s[k]=m;}
 if(raw.asc!==undefined&&dec(raw.asc)==='1') s.asc=true;
 if('cols' in raw){const c=metricList(raw.cols); if(c.length) s.cols=c;}
 if('p' in raw) s.providers=list(raw.p,Infinity);
 if('e' in raw) s.engines=list(raw.e,Infinity);
 if('max' in raw) s.maxCost=num(val('max'));
 if('pick' in raw) s.picked=list(raw.pick,MAX_PICKED);
 if('open' in raw){const o=val('open'); s.open=o&&o.length<=MAX_ID?o:null;}
 if('qs' in raw) s.q.subjects=list(raw.qs,Infinity).filter(v=>SUBJECTS.includes(v));
 if('qmin' in raw) s.q.minPoints=num(val('qmin'));
 const kind=val('qkind'); if(KINDS.includes(kind)) s.q.kind=kind;
 if('qmiss' in raw) s.q.minMissShare=num(val('qmiss'),1);
 return s;
}

const enc=encodeURIComponent;
const encList=a=>a.map(enc).join(',');
const same=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);

export function serializeExplore(s){
 const parts=[];
 const add=(k,v)=>parts.push(`${k}=${v}`);
 if(s.x!==D.x) add('x',enc(s.x));
 if(s.y!==D.y) add('y',enc(s.y));
 if(s.sort!==D.sort) add('sort',enc(s.sort));
 if(s.asc) add('asc','1');
 if(!same(s.cols,D.cols)) add('cols',encList(s.cols));
 if(s.providers.length) add('p',encList(s.providers));
 if(s.engines.length) add('e',encList(s.engines));
 if(s.maxCost!==null) add('max',String(s.maxCost));
 if(s.picked.length) add('pick',encList(s.picked));
 if(s.open!==null) add('open',enc(s.open));
 if(s.q.subjects.length) add('qs',encList(s.q.subjects));
 if(s.q.minPoints!==null) add('qmin',String(s.q.minPoints));
 if(s.q.kind!==null) add('qkind',enc(s.q.kind));
 if(s.q.minMissShare!==null) add('qmiss',String(s.q.minMissShare));
 return parts.length?'?'+parts.join('&'):'';
}

const hardQ={...D.q,subjects:[],minMissShare:0.3};
export const PRESETS=freeze([
 {id:'value',label:'가성비가 좋은 모델은?',patch:{x:'cost',y:'score'}},
 {id:'speed',label:'빠른 모델은?',patch:{x:'wall',y:'score'}},
 {id:'korean',label:'국어에 강한 모델은?',patch:{x:'cost',y:'subj:korean'}},
 {id:'hard',label:'어려운 문항에서 갈리는 모델은?',patch:{x:'cost',y:'fAccuracy',q:hardQ}},
 {id:'uncertainty',label:'모를 때 어떻게 행동하나?',patch:{x:'abstention',y:'accuracy'}},
]);
