import {resolve,sep} from 'node:path';
// macOS exposes decomposed filenames; Git stores these source PDFs in NFC.
// Normalize only at filesystem access so locked dataset/source-hash keys stay intact.
export function sourcePath(root,relative) {
 const base=resolve(root),path=resolve(base,relative.normalize('NFC'));
 if(!path.startsWith(base+sep))throw new Error('Source path outside repository');
 return path;
}
