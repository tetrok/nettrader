#!/usr/bin/env bash
set -euo pipefail

# Script pour déclencher une sauvegarde manuelle immédiate de la base MariaDB
# Usage: ./scripts/backup-now.sh [hourly|daily|manual]

TARGET_TYPE="${1:-manual}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups"
TIMESTAMP="$(date +'%Y%m%d_%H%M%S')"

case "${TARGET_TYPE}" in
  hourly)
    DEST_DIR="${BACKUP_DIR}/hourly"
    FILENAME="nettrader_hourly_${TIMESTAMP}.sql.gz"
    ;;
  daily)
    DEST_DIR="${BACKUP_DIR}/daily"
    FILENAME="nettrader_daily_${TIMESTAMP}.sql.gz"
    ;;
  manual|*)
    DEST_DIR="${BACKUP_DIR}/manual"
    FILENAME="nettrader_manual_${TIMESTAMP}.sql.gz"
    ;;
esac

mkdir -p "${DEST_DIR}"

echo "=================================================="
echo " NetTrader 2 — Sauvegarde manuelle de la base"
echo " Type: ${TARGET_TYPE}"
echo " Destination: ${DEST_DIR}/${FILENAME}"
echo "=================================================="

# Méthode 1: Exécuter mysqldump directement depuis le conteneur db
if docker compose ps db | grep -q "Up"; then
  echo "[1/2] Exportation et compression du dump MariaDB..."
  docker compose exec -T db mysqldump \
    -u root -prootpassword \
    --single-transaction \
    --quick \
    nettrader | gzip -c > "${DEST_DIR}/${FILENAME}"

  if [ -s "${DEST_DIR}/${FILENAME}" ]; then
    FILESIZE=$(du -h "${DEST_DIR}/${FILENAME}" | cut -f1)
    echo "[2/2] ✅ Sauvegarde réussie (${FILESIZE}) : ${DEST_DIR}/${FILENAME}"
  else
    echo "❌ Erreur : le fichier de sauvegarde produit est vide." >&2
    exit 1
  fi
else
  echo "❌ Le service 'db' n'est pas démarré dans Docker Compose." >&2
  echo "Lancez d'abord : docker compose up -d db" >&2
  exit 1
fi
