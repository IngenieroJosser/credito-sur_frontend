# Script v2 - Corrige 'use client' para TODOS los casos (con o sin punto y coma)

$root = "c:\Users\ACER\Desktop\Creditos del Sur\credito-sur_frontend"
$fixed = 0

# Patron: la primera linea es import logger, la segunda es 'use client' (con o sin ;)
$pattern = "^import \{ logger \} from '@/lib/logger'\r?\n'use client';?\r?\n"

Get-ChildItem -Recurse -Path "$root\app", "$root\components", "$root\lib", "$root\hooks" -Filter "*.tsx" -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $c = Get-Content -LiteralPath $_.FullName -Raw -ErrorAction Stop
        if ($c -match $pattern) {
            # Determinar si usa logger realmente
            $rest = $c -replace $pattern, ""
            $usesLogger = $rest -match "logger\.(log|warn|info|error|group)\("
            
            if ($usesLogger) {
                # Reconstruir: 'use client' primero, luego import logger
                $newContent = "'use client'`r`nimport { logger } from '@/lib/logger'`r`n" + $rest
            } else {
                # No usa logger en el cuerpo; quitarlo
                $newContent = "'use client'`r`n" + $rest
            }
            
            Set-Content -LiteralPath $_.FullName $newContent -NoNewline
            Write-Host "FIXED: $($_.Name)"
            $fixed++
        }
    } catch {
        Write-Host "ERROR: $($_.Name)"
    }
}

Write-Host ""
Write-Host "Total fixed: $fixed"
