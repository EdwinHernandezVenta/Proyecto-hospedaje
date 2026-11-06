# ==========================================
# PAIE ROYALE - ENCENDIDO DEL SISTEMA
# ==========================================

$ErrorActionPreference = "SilentlyContinue"

Write-Host ""
Write-Host "=========================================="
Write-Host "       ENCENDIENDO PAIE ROYALE"
Write-Host "=========================================="
Write-Host ""

# ------------------------------------------
# RUTAS DEL PROYECTO
# ------------------------------------------

$ProjectRoot = $PSScriptRoot
$ProjectFolder = Join-Path $ProjectRoot "PROYECTO HOSPEDAJE"
$Backend = Join-Path $ProjectFolder "backend"

$BackendUrl = "http://127.0.0.1:4000/health"
$LocalUrl = "http://localhost:4000"
$FunnelUrl = "https://paie.tail81601e.ts.net/"

$Tailscale = "C:\Program Files\Tailscale\tailscale.exe"

Write-Host "Proyecto:"
Write-Host $ProjectFolder
Write-Host ""

Write-Host "Backend:"
Write-Host $Backend
Write-Host ""

# ------------------------------------------
# VERIFICAR QUE EXISTA EL BACKEND
# ------------------------------------------

if (-not (Test-Path $Backend)) {

    Write-Host "ERROR: No se encontro la carpeta backend."
    Write-Host ""
    Write-Host "Ruta esperada:"
    Write-Host $Backend
    Write-Host ""

    Read-Host "Presiona ENTER para cerrar"
    exit
}

# ------------------------------------------
# FUNCION PARA COMPROBAR BACKEND
# ------------------------------------------

function Test-Backend {

    try {

        $response = Invoke-WebRequest `
            -Uri $BackendUrl `
            -UseBasicParsing `
            -TimeoutSec 3

        if ($response.StatusCode -eq 200) {
            return $true
        }

    } catch {
        return $false
    }

    return $false
}

# ------------------------------------------
# VERIFICAR BACKEND
# ------------------------------------------

Write-Host "Verificando servidor de Paie Royale..."
Write-Host ""

if (Test-Backend) {

    Write-Host "Backend ya esta funcionando."
    Write-Host "No se iniciara otro servidor."
    Write-Host ""

}
else {

    Write-Host "Backend no esta funcionando."
    Write-Host "Iniciando servidor de Paie Royale..."
    Write-Host ""

    # Comprobar si el puerto 4000 esta ocupado
    $portInUse = Get-NetTCPConnection `
        -LocalPort 4000 `
        -State Listen `
        -ErrorAction SilentlyContinue

    if ($portInUse) {

        Write-Host "El puerto 4000 ya esta ocupado."
        Write-Host "No se iniciara otro proceso para evitar conflictos."
        Write-Host ""

    }
    else {

        Start-Process powershell.exe `
            -ArgumentList `
            "-NoExit",
            "-Command",
            "Set-Location -LiteralPath '$Backend'; npm start"

        Write-Host "Servidor iniciado."
        Write-Host "Esperando a que el backend este disponible..."
        Write-Host ""

    }

    # --------------------------------------
    # ESPERAR BACKEND
    # --------------------------------------

    $backendReady = $false

    for ($i = 1; $i -le 20; $i++) {

        Start-Sleep -Seconds 1

        if (Test-Backend) {

            $backendReady = $true
            break

        }

        Write-Host "Esperando backend... $i/20"
    }

    Write-Host ""

    if ($backendReady) {

        Write-Host "Backend funcionando correctamente."

    }
    else {

        Write-Host "AVISO: El backend todavia no responde."
        Write-Host "Puedes revisar la ventana del backend."
    }

    Write-Host ""
}

# ------------------------------------------
# VERIFICAR TAILSCALE
# ------------------------------------------

Write-Host "Verificando Tailscale..."
Write-Host ""

if (-not (Test-Path $Tailscale)) {

    Write-Host "ERROR: No se encontro Tailscale."
    Write-Host ""
    Write-Host "Ruta esperada:"
    Write-Host $Tailscale
    Write-Host ""

    Write-Host "El backend puede seguir funcionando localmente."
    Write-Host ""

    Write-Host "=========================================="
    Write-Host "       PAIE ROYALE INICIADO"
    Write-Host "=========================================="
    Write-Host ""

    Write-Host "Local:"
    Write-Host $LocalUrl
    Write-Host ""

    Read-Host "Presiona ENTER para cerrar"

    exit
}

# ------------------------------------------
# COMPROBAR FUNNEL ACTUAL
# ------------------------------------------

Write-Host "Comprobando Tailscale Funnel..."
Write-Host ""

$funnelStatus = & $Tailscale funnel status 2>&1 | Out-String

if ($funnelStatus -match "paie\.tail81601e\.ts\.net" -or
    $funnelStatus -match "Funnel on") {

    Write-Host "Tailscale Funnel ya esta activo."
    Write-Host "No se iniciara otro Funnel."
    Write-Host ""

}
else {

    Write-Host "Tailscale Funnel no esta activo."
    Write-Host "Iniciando Funnel..."
    Write-Host ""

    & $Tailscale funnel --bg 4000

    Write-Host ""
    Write-Host "Funnel iniciado."
    Write-Host ""
}

# ------------------------------------------
# RESULTADO FINAL
# ------------------------------------------

Write-Host ""
Write-Host "=========================================="
Write-Host "       PAIE ROYALE INICIADO"
Write-Host "=========================================="
Write-Host ""

Write-Host "Local:"
Write-Host $LocalUrl
Write-Host ""

Write-Host "Funnel:"
Write-Host $FunnelUrl
Write-Host ""

Write-Host "El sistema ya esta listo."
Write-Host ""
Write-Host "No cierres la ventana del backend."
Write-Host "Tailscale Funnel puede permanecer activo."
Write-Host ""

Read-Host "Presiona ENTER para cerrar esta ventana"