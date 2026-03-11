# Script para corregir archivos .tsx donde el logger fue insertado ANTES de 'use client'
# El patron erroneo es: [import logger] [CRLF] ['use client']

$root = "c:\Users\ACER\Desktop\Creditos del Sur\credito-sur_frontend"
$fixed = 0
$skipped = 0

Get-ChildItem -Recurse -Path "$root\app" -Filter "*.tsx" | ForEach-Object {
    try {
        $content = Get-Content -LiteralPath $_.FullName -Raw -ErrorAction Stop
        
        # Detectar si el logger fue incorrectamente insertado antes de 'use client'
        # Patron: linea 1 = import logger, linea 2 = 'use client'
        if ($content -match "^import \{ logger \} from '@/lib/logger'\r?\n'use client'") {
            # Verificar si el archivo realmente USA logger.* (no solo tiene el import)
            $usesLogger = $content -match "logger\.(log|warn|info|error|group)\("
            
            if ($usesLogger) {
                # Mover 'use client' al top, dejar el import despues
                $newContent = $content -replace "^import \{ logger \} from '@/lib/logger'\r?\n'use client'\r?\n", "'use client'`r`nimport { logger } from '@/lib/logger'`r`n"
                Set-Content -LiteralPath $_.FullName $newContent -NoNewline
                Write-Host "FIXED (kept logger): $($_.Name)"
                $fixed++
            } else {
                # No usa logger realmente: quitar el import fantasma
                $newContent = $content -replace "^import \{ logger \} from '@/lib/logger'\r?\n", ""
                Set-Content -LiteralPath $_.FullName $newContent -NoNewline
                Write-Host "FIXED (removed unused logger): $($_.Name)"
                $fixed++
            }
        } else {
            $skipped++
        }
    } catch {
        Write-Host "ERROR: $($_.Name) - $_"
    }
}

Write-Host ""
Write-Host "Done. Fixed: $fixed | Skipped: $skipped"
