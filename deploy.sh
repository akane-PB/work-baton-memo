#!/bin/sh
set -eu

message="${1:-Update work baton memo app}"

git add index.html styles.css app.js deploy.sh
git commit -m "$message" || {
  echo "No changes to commit."
}
git push -u origin main
