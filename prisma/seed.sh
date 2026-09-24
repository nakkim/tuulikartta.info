#!/bin/sh
# Prisma's seed runner does not go through a shell, so $DATABASE_URL never
# gets expanded if referenced directly in package.json's "prisma.seed"
# command - running it through this script (itself interpreted by a real
# shell) fixes that.
set -e
cd "$(dirname "$0")"
psql "$DATABASE_URL" -f seed.sql
