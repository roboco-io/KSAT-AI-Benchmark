#!/usr/bin/env python3
"""Run named KSAT models and publish only their benchmark artifacts."""
import argparse
import json
import os
from datetime import datetime
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
GOOGLE_BLOCK = 'Antigravity CLI 1.3.2 headless 입력은 텍스트만 지원합니다. 원본 이미지 시험 어댑터 지원을 확인하기 전까지 실행할 수 없습니다.'


def command(args, capture=False, check=True):
    return subprocess.run(args, cwd=ROOT, text=True, capture_output=capture, check=check)


def catalog():
    result = command(['node', '--input-type=module', '-e', "import {MODELS} from './benchmark/models.mjs'; import {routeAgent} from './benchmark/profiles.mjs';console.log(JSON.stringify(MODELS.map(m=>({...m,agent:routeAgent(m)}))))"], capture=True)
    return json.loads(result.stdout)


def register(path):
    profile = json.loads(Path(path).read_text())
    subprocess.run(['node', '--input-type=module', '-e', "import{validateProfile}from'./benchmark/profiles.mjs';let s='';for await(const x of process.stdin)s+=x;validateProfile(JSON.parse(s));"], input=json.dumps(profile), cwd=ROOT, text=True, check=True, capture_output=True)
    if any(m['id'] == profile['id'] for m in catalog()):
        raise ValueError('Model ID already exists; preserve its profile and locked answers')
    folder = ROOT / 'benchmark/profiles'
    folder.mkdir(exist_ok=True)
    target = folder / (profile['id'] + '.json')
    with target.open('x') as output:
        json.dump(profile, output, ensure_ascii=False, indent=2)
        output.write('\n')
    print('Registered ' + profile['id'])
    return profile['id']


def in_progress(model):
    lock = ROOT / '.runtime/locks' / (model['id'] + '.json')
    if lock.exists():
        try:
            pid = json.loads(lock.read_text())['pid']
            if isinstance(pid, int) and pid > 0:
                os.kill(pid, 0)
                return True
        except (ProcessLookupError, FileNotFoundError, KeyError, ValueError):
            pass
    path = ROOT / model['directory'] / 'run.json'
    state = json.loads(path.read_text()) if path.exists() else {}
    if state.get('completed'):
        return False
    updated = state.get('updated_at')
    if not updated:
        return False
    age = time.time() - datetime.fromisoformat(updated.replace('Z', '+00:00')).timestamp()
    return age < 30 and any(a.get('status') == 'running' for g in state.get('groups', {}).values() for a in g.get('attempts', []))


def snapshot(model):
    path = ROOT / model['directory'] / 'run.json'
    run = json.loads(path.read_text()) if path.exists() else {}
    return {'model': model['id'], 'agent': model['agent'], 'completed': run.get('completed', False), 'in_progress': in_progress(model), 'submitted': len(run.get('answers', {})), 'blocked_reason': GOOGLE_BLOCK if model['agent'] == 'antigravity' else run.get('blocked_reason'), 'authentication': 'API scope must be authorized' if model.get('pi') else 'Existing subscription; runner checks before input'}


def authorize(models):
    path = ROOT / '.runtime/pi-api-authorization.json'
    path.parent.mkdir(exist_ok=True)
    record = json.loads(path.read_text()) if path.exists() else {}
    record['allowed_models'] = sorted(set(record.get('allowed_models', []) + [m['id'] for m in models if m.get('pi')]))
    record['user_authorized'] = True
    record['basis'] = 'Explicit named-model API evaluation authorized by the invoking user'
    path.write_text(json.dumps(record, indent=2) + '\n')
    path.chmod(0o600)


def publish(models):
    branch = command(["git", "branch", "--show-current"], capture=True).stdout.strip()
    if branch != "main":
        raise RuntimeError("Pages publication requires main; preserve the current branch and integrate deliberately")
    paths = ['web/public/data/benchmark-comparison.json', 'web/public/data/benchmark-v2.json']
    for model in models:
        for path in [model['directory'] + '/run.json', 'benchmark/profiles/' + model['id'] + '.json']:
            if (ROOT / path).exists():
                paths.append(path)
    command(['git', 'add', '--', *paths])
    changed = command(['git', 'diff', 'HEAD', '--name-only', '--', *paths], capture=True).stdout.strip()
    if changed:
        command(['git', 'commit', '--only', '-m', 'Register named KSAT model evaluations', '--', *paths])
    head = command(['git', 'rev-parse', 'HEAD'], capture=True).stdout.strip()
    remotes = command(['git', 'remote'], capture=True).stdout.split()
    for remote in remotes:
        command(['git', 'push', remote, 'HEAD:main'])
        remote_head = command(['git', 'ls-remote', remote, 'refs/heads/main'], capture=True).stdout.split()[0]
        if remote_head != head:
            raise RuntimeError('Remote push verification failed: ' + remote)
    if 'origin' not in remotes:
        raise RuntimeError('GitHub Pages origin remote is unavailable')
    workflow_id = None
    for _ in range(12):
        runs = json.loads(command(['gh', 'run', 'list', '--workflow', 'deploy-pages.yml', '--commit', head, '--limit', '1', '--json', 'databaseId'], capture=True).stdout)
        if runs:
            workflow_id = str(runs[0]['databaseId'])
            break
        time.sleep(5)
    if workflow_id:
        command(['gh', 'run', 'watch', workflow_id, '--exit-status'])
    else:
        raise RuntimeError('A deployment workflow was not found; verify Pages before reporting completion')
    import urllib.request
    url = 'https://roboco.io/KSAT-AI-Benchmark/data/benchmark-comparison.json?v=' + head
    with urllib.request.urlopen(url, timeout=30) as response:
        public = json.load(response)
    local = json.loads((ROOT / 'web/public/data/benchmark-comparison.json').read_text())
    for model in models:
        expected = next((r for r in local['models'] if r['model'] == model['id']), None)
        actual = next((r for r in public['models'] if r['model'] == model['id']), None)
        if expected is not None and (actual is None or actual['summary'] != expected['summary'] or actual['questions'] != expected['questions']):
            raise RuntimeError('Published data differs for ' + model['id'])
        expected_status = next(m for m in local['requested_models'] if m['id'] == model['id'])
        actual_status = next((m for m in public['requested_models'] if m['id'] == model['id']), None)
        if actual_status != expected_status:
            raise RuntimeError('Published model state differs for ' + model['id'])
    print('Published and verified: https://roboco.io/KSAT-AI-Benchmark/')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--model', action='append', default=[])
    parser.add_argument('--register', help='Register a verified metadata-only profile JSON')
    parser.add_argument('--dry-run', action='store_true', help='Read metadata and progress; do not call models or publish')
    parser.add_argument('--authorize-api', action='store_true', help='Record the invoking user\'s API authorization only for the named Pi models')
    parser.add_argument('--no-publish', action='store_true', help='Export and build locally without git push or Pages deployment')
    args = parser.parse_args()
    if args.dry_run and args.register:
        parser.error("--register changes metadata; use --dry-run separately")
    if args.register:
        register(args.register)
    available = catalog()
    if not args.model:
        if args.register:
            return 0
        parser.error('Specify at least one --model')
    models = []
    for name in args.model:
        matches = [m for m in available if m['id'] == name or m['label'].casefold() == name.casefold()]
        if len(matches) != 1:
            raise ValueError('Unknown or ambiguous model; register verified metadata first: ' + name)
        if matches[0]['id'] not in [m['id'] for m in models]:
            models.append(matches[0])
    print(json.dumps([snapshot(m) for m in models], ensure_ascii=False, indent=2), flush=True)
    if args.dry_run:
        return 0
    if args.authorize_api:
        authorize(models)
    failed = []
    for model in models:
        if model['agent'] == 'antigravity':
            print(model['id'] + ': BLOCKED: ' + GOOGLE_BLOCK, flush=True)
            failed.append(model['id'])
            continue
        while in_progress(model):
            print(json.dumps({'waiting_for_existing_run': model['id'], 'submitted': snapshot(model)['submitted']}, ensure_ascii=False), flush=True)
            time.sleep(10)
        existing = ROOT / model['directory'] / 'run.json'
        if existing.exists() and json.loads(existing.read_text()).get('finalization', {}).get('state') == 'finished_with_errors':
            print(model['id'] + ': execution finalized with errors; preserve recorded results', flush=True)
            failed.append(model['id'])
            continue
        result = command(['node', 'benchmark/run.mjs', '--model', model['id']], check=False)
        if result.returncode and model.get('pi'):
            state_path = ROOT / model['directory'] / 'run.json'
            state = json.loads(state_path.read_text()) if state_path.exists() else {}
            errors = [a.get('error', '') for g in state.get('groups', {}).values() for a in g.get('attempts', [])]
            if not state.get('blocked_reason') and not state.get('protocol', {}).get('batch_max_questions') and any(('PI_TURN_FAILED' in e or 'PI_ABORTED' in e) and 'DataInspectionFailed' not in e for e in errors):
                result = command(['node', 'benchmark/run.mjs', '--model', model['id'], '--recover-with-batches', '6'], check=False)
        if result.returncode:
            failed.append(model['id'])
    command(['node', 'benchmark/export.mjs'])
    command(['npm', 'test', '--prefix', 'benchmark'])
    command(['npm', 'run', 'build', '--prefix', 'web'])
    if not args.no_publish:
        publish(models)
    print(json.dumps({'requested': [m['id'] for m in models], 'incomplete': failed, 'dashboard': 'https://roboco.io/KSAT-AI-Benchmark/'}, ensure_ascii=False))
    return 1 if failed else 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print('KSAT workflow stopped: ' + str(error), file=sys.stderr)
        raise SystemExit(1)
