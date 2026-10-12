import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
export function parseLiteralSecret(source,name) {
 if(!/^[A-Z][A-Z0-9_]*$/.test(name))throw new Error('API_SECRET_INVALID: invalid credential name');
 const raw=source.match(new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=\\s*(.*)$`,'m'))?.[1]?.trim();
 if(!raw)throw new Error(`API_SECRET_MISSING: ${name}`);
 if(/[$`]/.test(raw))throw new Error(`API_SECRET_INVALID: ${name} must be a literal assignment`);
 const quoted=raw.match(/^(['"])(.*?)\1\s*(?:#.*)?$/);
 const bare=raw.match(/^([A-Za-z0-9._:+/=-]+)\s*(?:#.*)?$/);
 const value=quoted?.[2]??bare?.[1];
 if(!value||/[\s\\]/.test(value))throw new Error(`API_SECRET_INVALID: ${name} must be a literal token`);
 return value;
}
export function readPiSecret(name,path=join(homedir(),'.zsh_secrets')) {
 return parseLiteralSecret(readFileSync(path,'utf8'),name);
}
export function piEnvironment(apiKey,agentDir,source=process.env) {
 const env=Object.fromEntries(Object.entries(source).filter(([name])=>/^(PATH|HOME|TMPDIR|LANG|LC_[A-Z_]+|NODE_EXTRA_CA_CERTS)$/.test(name)));
 return {...env,PI_CODING_AGENT_DIR:agentDir,PI_OFFLINE:'1',PI_TELEMETRY:'0',KSAT_PI_API_KEY:apiKey};
}
