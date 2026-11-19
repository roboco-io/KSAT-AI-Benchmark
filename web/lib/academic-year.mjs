export function academicYearFromSearch(search) {
 const year=Number(new URLSearchParams(search).get('year'));
 return [2025,2026].includes(year)?year:2027;
}
export function academicYearUrl(href,year) {
 if(![2025,2026,2027].includes(year))throw new Error('Academic year is unavailable');
 const url=new URL(href);
 for(const key of ['model','subject','question'])url.searchParams.delete(key);
 url.searchParams.set('year',String(year));
 url.hash='';
 return url.href;
}
