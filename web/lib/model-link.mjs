export function modelFromSearch(search, modelIds) {
 const id = new URLSearchParams(search).get('model');
 return id && modelIds.includes(id) ? id : null;
}

export function modelShareUrl(href, modelId) {
 const url = new URL(href);
 url.searchParams.set('model', modelId);
 return url.href;
}
