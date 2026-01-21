#!/usr/bin/env node

/**
 * Security Audit Script
 *
 * Ejecuta todas las verificaciones de seguridad:
 * 1. npm audit - vulnerabilidades en dependencias
 * 2. ESLint con reglas de seguridad
 * 3. Análisis de código estático
 *
 * Uso: npm run security
 */

import { execSync, spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colores para la terminal
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(`  ${title}`, 'cyan');
  console.log('='.repeat(60) + '\n');
}

function runCommand(command, description, ignoreErrors = false) {
  log(`Running: ${description}...`, 'blue');
  try {
    const output = execSync(command, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { success: true, output };
  } catch (error) {
    if (ignoreErrors) {
      return { success: false, output: error.stdout || error.stderr || error.message };
    }
    return { success: false, output: error.stdout || error.stderr || error.message };
  }
}

async function main() {
  log('\n🔒 SECURITY AUDIT - MiEcommerce', 'bold');
  log('================================\n', 'bold');

  const results = {
    npmAudit: null,
    eslintSecurity: null,
    envCheck: null,
    secretsCheck: null,
  };

  // 1. npm audit
  logSection('1. NPM AUDIT - Vulnerabilidades en dependencias');
  const npmAuditResult = runCommand('npm audit --json 2>/dev/null || npm audit 2>&1', 'npm audit', true);

  try {
    const auditData = JSON.parse(npmAuditResult.output);
    const vulns = auditData.metadata?.vulnerabilities || {};
    const total = vulns.total || 0;
    const critical = vulns.critical || 0;
    const high = vulns.high || 0;

    if (total === 0) {
      log('✅ No se encontraron vulnerabilidades', 'green');
      results.npmAudit = 'pass';
    } else {
      log(`⚠️  Vulnerabilidades encontradas:`, 'yellow');
      log(`   - Críticas: ${critical}`, critical > 0 ? 'red' : 'green');
      log(`   - Altas: ${high}`, high > 0 ? 'red' : 'yellow');
      log(`   - Total: ${total}`, 'yellow');
      log('\n   Ejecuta: npm audit fix', 'blue');
      results.npmAudit = critical > 0 || high > 0 ? 'fail' : 'warn';
    }
  } catch {
    log(npmAuditResult.output, 'yellow');
    results.npmAudit = 'unknown';
  }

  // 2. ESLint Security
  logSection('2. ESLINT SECURITY - Análisis de código');
  const eslintResult = runCommand(
    'npx eslint src --ext .js,.jsx,.ts,.tsx --format compact 2>&1 | grep -i "security" || echo "No security issues found"',
    'ESLint security rules',
    true
  );

  if (eslintResult.output.includes('No security issues found') || eslintResult.output.trim() === '') {
    log('✅ No se encontraron problemas de seguridad en el código', 'green');
    results.eslintSecurity = 'pass';
  } else {
    log('⚠️  Problemas de seguridad encontrados:', 'yellow');
    console.log(eslintResult.output);
    results.eslintSecurity = 'warn';
  }

  // 3. Verificar archivos .env
  logSection('3. ENV CHECK - Archivos de configuración');
  const envFiles = ['.env', '.env.local', '.env.production', '.env.development'];
  let envIssues = [];

  for (const envFile of envFiles) {
    const envPath = join(rootDir, envFile);
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8');

      // Verificar si hay secrets hardcodeados (no variables de entorno)
      const suspiciousPatterns = [
        /password\s*=\s*['"]*[a-zA-Z0-9!@#$%^&*]{8,}['"]*$/gim,
        /secret\s*=\s*['"]*[a-zA-Z0-9]{20,}['"]*$/gim,
        /api_key\s*=\s*['"]*sk_live_[a-zA-Z0-9]+['"]*$/gim,
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          envIssues.push(`${envFile}: Posible secret hardcodeado detectado`);
        }
      }
    }
  }

  if (envIssues.length === 0) {
    log('✅ Archivos .env parecen seguros', 'green');
    results.envCheck = 'pass';
  } else {
    log('⚠️  Posibles problemas en archivos .env:', 'yellow');
    envIssues.forEach((issue) => log(`   - ${issue}`, 'yellow'));
    results.envCheck = 'warn';
  }

  // 4. Buscar secrets en código
  logSection('4. SECRETS CHECK - Búsqueda de secrets en código');
  const secretsResult = runCommand(
    `grep -r -n -E "(password|secret|api_key|apikey|token)\\s*[:=]\\s*['\"][^'\"]{10,}['\"]" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ 2>/dev/null | grep -v "process.env" | grep -v "import.meta.env" | head -20 || echo "No hardcoded secrets found"`,
    'Searching for hardcoded secrets',
    true
  );

  if (secretsResult.output.includes('No hardcoded secrets found') || secretsResult.output.trim() === '') {
    log('✅ No se encontraron secrets hardcodeados', 'green');
    results.secretsCheck = 'pass';
  } else {
    log('⚠️  Posibles secrets hardcodeados:', 'yellow');
    console.log(secretsResult.output);
    results.secretsCheck = 'warn';
  }

  // Resumen final
  logSection('RESUMEN');

  const statusSymbols = {
    pass: '✅',
    warn: '⚠️ ',
    fail: '❌',
    unknown: '❓',
  };

  console.log(`${statusSymbols[results.npmAudit]} npm audit: ${results.npmAudit}`);
  console.log(`${statusSymbols[results.eslintSecurity]} ESLint security: ${results.eslintSecurity}`);
  console.log(`${statusSymbols[results.envCheck]} ENV check: ${results.envCheck}`);
  console.log(`${statusSymbols[results.secretsCheck]} Secrets check: ${results.secretsCheck}`);

  const hasFail = Object.values(results).includes('fail');
  const hasWarn = Object.values(results).includes('warn');

  console.log('\n' + '-'.repeat(60));

  if (hasFail) {
    log('\n❌ AUDIT FAILED - Hay problemas críticos que resolver\n', 'red');
    process.exit(1);
  } else if (hasWarn) {
    log('\n⚠️  AUDIT PASSED WITH WARNINGS - Revisa las advertencias\n', 'yellow');
    process.exit(0);
  } else {
    log('\n✅ AUDIT PASSED - Todo parece seguro!\n', 'green');
    process.exit(0);
  }
}

main().catch((error) => {
  log(`\n❌ Error ejecutando audit: ${error.message}\n`, 'red');
  process.exit(1);
});
