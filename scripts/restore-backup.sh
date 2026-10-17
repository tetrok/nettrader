#!/usr/bin/env bash
set -euo pipefail

# Script pour restaurer une sauvegarde dans MariaDB
# Usage: ./scripts/restore-backup.sh [chemin_du_fichier_backup.sql.gz]

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${ROOT_DIR}/backups"

FILE_TO_RESTORE="${1:-}"

# Si aucun fichier n'est spécifié, afficher la liste des backups disponibles
if [ -z "${FILE_TO_RESTORE}" ]; then
  echo "=================================================="
  echo " NetTrader 2 — Restauration de Sauvegarde MariaDB"
  echo "=================================================="
  echo "Sauvegardes disponibles :"
  echo ""
  
  MAPFILE=()
  while IFS= read -r -d $'\0' file; do
    MAPFILE+=("$file")
  done < <(find "${BACKUP_DIR}" -type f \( -name "*.sql.gz" -o -name "*.sql" \) -print0 | sort -z -r)

  if [ ${#MAPFILE[@]} -eq 0 ]; then
    echo "Aucune sauvegarde trouvée dans ${BACKUP_DIR}."
    echo "Usage: $0 /chemin/vers/fichier.sql.gz"
    exit 1
  fi

  for i in "${!MAPFILE[@]}"; do
    SIZE=$(du -h "${MAPFILE[$i]}" | cut -f1)
    echo "  [$((i+1))] ${MAPFILE[$i]} (${SIZE})"
  done

  echo ""
  read -r -p "Entrez le numéro de la sauvegarde à restaurer (ou 'q' pour quitter) : " CHOICE

  if [[ "${CHOICE}" =~ ^[0-9]+$ ]] && [ "${CHOICE}" -ge 1 ] && [ "${CHOICE}" -le "${#MAPFILE[@]}" ]; then
    FILE_TO_RESTORE="${MAPFILE[$((CHOICE-1))]}"
  else
    echo "Restauration annulée."
    exit 0
  fi
fi

if [ ! -f "${FILE_TO_RESTORE}" ]; then
  echo "❌ Erreur : Fichier introuvable : ${FILE_TO_RESTORE}" >&2
  exit 1
fi

echo ""
echo "⚠️  ATTENTION : La restauration va écraser les données existantes de la base 'nettrader'."
echo "Fichier sélectionné : ${FILE_TO_RESTORE}"
read -r -p "Confirmez-vous la restauration ? (oui/non) : " CONFIRM

if [ "${CONFIRM}" != "oui" ] && [ "${CONFIRM}" != "yes" ] && [ "${CONFIRM}" != "y" ]; then
  echo "Opération annulée."
  exit 0
fi

echo "[1/3] Vérification de la disponibilité du service MariaDB..."
if ! docker compose ps db | grep -q "Up"; then
  echo "❌ Le service 'db' n'est pas démarré. Lancez : docker compose up -d db" >&2
  exit 1
fi

echo "[2/3] Injection du dump dans la base 'nettrader'..."
if [[ "${FILE_TO_RESTORE}" == *.gz ]]; then
  gzip -cd "${FILE_TO_RESTORE}" | docker compose exec -T db mysql -u root -prootpassword nettrader
else
  docker compose exec -T db mysql -u root -prootpassword nettrader < "${FILE_TO_RESTORE}"
fi

echo "[3/3] ✅ Restauration terminée avec succès depuis ${FILE_TO_RESTORE} !"
