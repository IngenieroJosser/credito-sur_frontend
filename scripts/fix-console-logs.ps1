$files = @(
  "app\admin\dashboard-client.tsx",
  "app\admin\users\page.tsx",
  "app\admin\users\nuevo\page.tsx",
  "app\admin\rutas\[id]\ruta-client.tsx",
  "app\admin\prestamos\[id]\editar\page.tsx",
  "app\admin\creditos-articulos\page.tsx",
  "app\admin\articulos\nuevo\page.tsx",
  "app\admin\solicitudes\page.tsx",
  "app\supervisor\clientes\page.tsx",
  "app\supervisor\pagos\registrar\[clienteId]\page.tsx",
  "app\coordinador\rutas\[id]\page.tsx",
  "app\coordinador\creditos\[id]\page.tsx",
  "app\coordinador\creditos\[id]\editar\page.tsx",
  "app\cobranzas\solicitudes\page.tsx",
  "app\login\page.tsx"
)

foreach ($f in $files) {
  if (Test-Path $f) {
    $content = Get-Content $f -Raw
    $newContent = $content -replace "console\.log\(", "logger.log(" -replace "console\.warn\(", "logger.warn(" -replace "console\.info\(", "logger.info("
    if ($newContent -ne $content) {
      if ($newContent -notmatch "from '@/lib/logger'") {
        $newContent = "import { logger } from '@/lib/logger'`n" + $newContent
      }
      Set-Content $f $newContent
      Write-Host "Updated: $f"
    } else {
      Write-Host "No console.log found: $f"
    }
  } else {
    Write-Host "NOT FOUND: $f"
  }
}
Write-Host "Done."
