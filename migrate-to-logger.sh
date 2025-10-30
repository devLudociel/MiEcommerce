#!/bin/bash

# Script para migrar console.log/error/warn a sistema de logger
# Uso: ./migrate-to-logger.sh

echo "🔄 Iniciando migración de console.log a logger..."

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Archivos prioritarios para migrar
FILES=(
  "src/pages/api/save-order.ts"
  "src/pages/api/create-payment-intent.ts"
  "src/pages/api/get-wallet-balance.ts"
  "src/pages/api/get-wallet-transactions.ts"
  "src/pages/api/stripe-webhook.ts"
  "src/lib/firebase-admin.ts"
)

# Función para agregar import si no existe
add_logger_import() {
  local file="$1"

  # Verificar si ya tiene el import
  if grep -q "import { logger } from" "$file"; then
    echo "  ✓ Import ya existe"
    return
  fi

  # Agregar import después de otras importaciones
  sed -i "1a import { logger } from '../../lib/logger';" "$file"
  echo -e "  ${GREEN}✓${NC} Import agregado"
}

# Función para reemplazar console.log
replace_console_calls() {
  local file="$1"
  local count=0

  # console.log -> logger.info
  if grep -q "console\.log" "$file"; then
    sed -i "s/console\.log(/logger.info(/g" "$file"
    count=$((count + $(grep -c "logger.info" "$file")))
  fi

  # console.error -> logger.error
  if grep -q "console\.error" "$file"; then
    sed -i "s/console\.error(/logger.error(/g" "$file"
    count=$((count + $(grep -c "logger.error" "$file")))
  fi

  # console.warn -> logger.warn
  if grep -q "console\.warn" "$file"; then
    sed -i "s/console\.warn(/logger.warn(/g" "$file"
    count=$((count + $(grep -c "logger.warn" "$file")))
  fi

  echo -e "  ${GREEN}✓${NC} $count llamadas migradas"
}

# Procesar cada archivo
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "\n📄 Procesando: ${YELLOW}$file${NC}"

    # Crear backup
    cp "$file" "${file}.backup"
    echo "  ✓ Backup creado"

    # Agregar import
    add_logger_import "$file"

    # Reemplazar llamadas
    replace_console_calls "$file"

  else
    echo -e "\n⚠️  Archivo no encontrado: $file"
  fi
done

echo -e "\n${GREEN}✅ Migración completada!${NC}"
echo ""
echo "📋 Siguientes pasos:"
echo "1. Revisa los cambios: git diff"
echo "2. Prueba que todo funcione: npm run dev"
echo "3. Si algo sale mal, restaura los backups: *.backup"
echo "4. Cuando todo esté OK, elimina los backups: rm src/**/*.backup"
echo ""
echo "Para migrar más archivos, agrega sus rutas al array FILES en este script."
