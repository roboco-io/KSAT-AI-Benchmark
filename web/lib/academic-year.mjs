export function academicYearFromSearch(search) {
 const year=Number(new URLSearchParams(search).get('year'));
 return [2025,2026].includes(year)?year:2027;
}
// 2027 only: 'main' is periods 1-3 (Korean·math·English); 'period4' is Korean history and social/science inquiry.
export function examSessionFromSearch(search) {
 return new URLSearchParams(search).get('session')==='period4'?'period4':'main';
}
export function examSessionUrl(href,session) {
 const url=new URL(href);
 for(const key of ['model','subject','question'])url.searchParams.delete(key);
 if(session==='period4')url.searchParams.set('session','period4');else url.searchParams.delete('session');
 url.hash='';
 return url.href;
}
export function academicYearUrl(href,year) {
 if(![2025,2026,2027].includes(year))throw new Error('Academic year is unavailable');
 const url=new URL(href);
 for(const key of ['model','subject','question'])url.searchParams.delete(key);
 url.searchParams.set('year',String(year));
 if(year!==2027)url.searchParams.delete('session');
 url.hash='';
 return url.href;
}
