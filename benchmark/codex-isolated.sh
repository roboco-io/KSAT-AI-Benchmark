#!/bin/sh
# SDK sends 'exec' first. Disable user configuration while retaining CLI login.
if [ "$1" = "exec" ]; then shift; fi
exec codex exec --ignore-user-config --ephemeral "$@"
