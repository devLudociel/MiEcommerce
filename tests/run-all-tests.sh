#!/bin/bash

# Script para ejecutar toda la suite de tests de seguridad
# Uso: ./tests/run-all-tests.sh [--watch] [--coverage] [--e2e]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_color() {
    color=$1
    message=$2
    echo -e "${color}${message}${NC}"
}

# Función para imprimir encabezado
print_header() {
    echo ""
    print_color "$BLUE" "================================"
    print_color "$BLUE" "$1"
    print_color "$BLUE" "================================"
    echo ""
}

# Parse argumentos
WATCH=false
COVERAGE=false
E2E=false
UNIT_ONLY=false
INTEGRATION_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --watch|-w)
            WATCH=true
            shift
            ;;
        --coverage|-c)
            COVERAGE=true
            shift
            ;;
        --e2e|-e)
            E2E=true
            shift
            ;;
        --unit|-u)
            UNIT_ONLY=true
            shift
            ;;
        --integration|-i)
            INTEGRATION_ONLY=true
            shift
            ;;
        --help|-h)
            echo "Uso: $0 [opciones]"
            echo ""
            echo "Opciones:"
            echo "  --watch, -w         Ejecutar tests en modo watch"
            echo "  --coverage, -c      Generar reporte de cobertura"
            echo "  --e2e, -e           Ejecutar tests E2E con Playwright"
            echo "  --unit, -u          Solo tests unitarios"
            echo "  --integration, -i   Solo tests de integración"
            echo "  --help, -h          Mostrar esta ayuda"
            exit 0
            ;;
        *)
            print_color "$RED" "Opción desconocida: $1"
            echo "Usa --help para ver opciones disponibles"
            exit 1
            ;;
    esac
done

# Banner
print_header "🧪 SUITE DE TESTS DE SEGURIDAD - MiEcommerce"

# Verificar que node_modules existe
if [ ! -d "node_modules" ]; then
    print_color "$YELLOW" "⚠️  node_modules no encontrado. Instalando dependencias..."
    npm install
fi

# Contador de tests exitosos
TESTS_PASSED=0
TESTS_FAILED=0

# Función para ejecutar comando y contar resultado
run_test() {
    if "$@"; then
        ((TESTS_PASSED++))
        return 0
    else
        ((TESTS_FAILED++))
        return 1
    fi
}

# Tests Unitarios
if [ "$INTEGRATION_ONLY" = false ] && [ "$E2E" = false ]; then
    print_header "1️⃣  Tests Unitarios"

    if [ "$WATCH" = true ]; then
        print_color "$BLUE" "▶️  Ejecutando en modo watch..."
        npm run test:unit -- --watch
        exit 0
    elif [ "$COVERAGE" = true ]; then
        print_color "$BLUE" "▶️  Ejecutando con cobertura..."
        run_test npm run test:unit -- --coverage || true
    else
        print_color "$BLUE" "▶️  Ejecutando tests unitarios..."
        run_test npm run test:unit || true
    fi

    echo ""
fi

# Tests de Integración
if [ "$UNIT_ONLY" = false ] && [ "$E2E" = false ]; then
    print_header "2️⃣  Tests de Integración"

    if [ "$COVERAGE" = true ]; then
        print_color "$BLUE" "▶️  Ejecutando con cobertura..."
        run_test npm run test:integration -- --coverage || true
    else
        print_color "$BLUE" "▶️  Ejecutando tests de integración..."
        run_test npm run test:integration || true
    fi

    echo ""
fi

# Tests E2E
if [ "$E2E" = true ] && [ "$UNIT_ONLY" = false ] && [ "$INTEGRATION_ONLY" = false ]; then
    print_header "3️⃣  Tests End-to-End (Playwright)"

    print_color "$YELLOW" "⚠️  Nota: Los tests E2E requieren que la aplicación esté corriendo"
    print_color "$YELLOW" "   Asegúrate de tener el servidor en http://localhost:4321"
    echo ""

    read -p "¿La aplicación está corriendo? (y/n) " -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_color "$BLUE" "▶️  Ejecutando tests E2E..."
        run_test npx playwright test tests/e2e --reporter=html || true
        print_color "$GREEN" "📊 Reporte HTML disponible en: playwright-report/index.html"
    else
        print_color "$YELLOW" "⏭️  Saltando tests E2E"
    fi

    echo ""
fi

# Resumen final
print_header "📊 RESUMEN DE TESTS"

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))

if [ $TOTAL_TESTS -gt 0 ]; then
    echo "Total de suites ejecutadas: $TOTAL_TESTS"
    print_color "$GREEN" "✅ Exitosas: $TESTS_PASSED"

    if [ $TESTS_FAILED -gt 0 ]; then
        print_color "$RED" "❌ Fallidas: $TESTS_FAILED"
    fi

    echo ""

    PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
    if [ $PASS_RATE -eq 100 ]; then
        print_color "$GREEN" "🎉 ¡TODOS LOS TESTS PASARON! ($PASS_RATE%)"
        exit 0
    elif [ $PASS_RATE -ge 80 ]; then
        print_color "$YELLOW" "⚠️  Algunos tests fallaron ($PASS_RATE% exitosos)"
        exit 1
    else
        print_color "$RED" "❌ Muchos tests fallaron ($PASS_RATE% exitosos)"
        exit 1
    fi
else
    print_color "$YELLOW" "⚠️  No se ejecutaron tests"
    exit 0
fi
