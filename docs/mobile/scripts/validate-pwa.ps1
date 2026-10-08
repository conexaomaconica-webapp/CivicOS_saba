# ============================================================================
# Script de Validação PWA — Conexão Maçônica (CivicOS SABA)
# ============================================================================
# Teste de fumaça e auditoria manual para ambiente local ou de staging.
# USO: .\docs\mobile\scripts\validate-pwa.ps1 [-BaseUrl "https://saas-platform-4x7imu27u-saas-platform1.vercel.app"]
# ============================================================================

param (
    [string]$BaseUrl = "http://localhost:3000"
)

# Normaliza BaseUrl removendo barra final
$BaseUrl = $BaseUrl.TrimEnd('/')

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  VALIDAÇÃO PWA — CONEXÃO MAÇÔNICA (FASE MOBILE 1)" -ForegroundColor Yellow
Write-Host "  Target: $BaseUrl" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

$ErrorsCount = 0

function Assert-Endpoint {
    param (
        [string]$Path,
        [int]$ExpectedStatus = 200,
        [string]$Description
    )
    $CleanPath = if ($Path.StartsWith('/')) { $Path } else { "/$Path" }
    $Url = "$BaseUrl$CleanPath"
    try {
        $Response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10 -MaximumRedirection 5 -ErrorAction Stop
        if ($Response.StatusCode -eq $ExpectedStatus) {
            Write-Host " [OK] $Description ($CleanPath) -> Status $($Response.StatusCode)" -ForegroundColor Green
            return $Response
        } else {
            Write-Host " [FAIL] $Description ($CleanPath) -> Retornou Status $($Response.StatusCode), esperado $ExpectedStatus" -ForegroundColor Red
            $global:ErrorsCount++
            return $null
        }
    } catch {
        Write-Host " [FAIL] $Description ($CleanPath) -> Erro de Conexão: $_" -ForegroundColor Red
        $global:ErrorsCount++
        return $null
    }
}

# 1. Testar Service Worker
Write-Host "`n1. Verificando Service Worker..." -ForegroundColor Cyan
Assert-Endpoint -Path "/sw.js" -Description "Service Worker PWA"

# 2. Testar Manifesto Web
Write-Host "`n2. Verificando Web App Manifest..." -ForegroundColor Cyan
$ManifestRes = Assert-Endpoint -Path "/manifest.webmanifest" -Description "Web App Manifest"

if ($ManifestRes) {
    try {
        $ManifestJson = $ManifestRes.Content | ConvertFrom-Json
        if ($ManifestJson.name -eq "Conexão Maçônica") {
            Write-Host " [OK] Manifest name: '$($ManifestJson.name)'" -ForegroundColor Green
        } else {
            Write-Host " [FAIL] Manifest name incorreto: '$($ManifestJson.name)'" -ForegroundColor Red
            $ErrorsCount++
        }

        if ($ManifestJson.theme_color -eq "#4B161B") {
            Write-Host " [OK] Manifest theme_color oficial: '$($ManifestJson.theme_color)'" -ForegroundColor Green
        } else {
            Write-Host " [FAIL] Manifest theme_color incorreto: '$($ManifestJson.theme_color)'" -ForegroundColor Red
            $ErrorsCount++
        }

        if ($ManifestJson.background_color -eq "#F3EEDD") {
            Write-Host " [OK] Manifest background_color oficial: '$($ManifestJson.background_color)'" -ForegroundColor Green
        } else {
            Write-Host " [FAIL] Manifest background_color incorreto: '$($ManifestJson.background_color)'" -ForegroundColor Red
            $ErrorsCount++
        }

        if ($ManifestJson.start_url -eq "/guia") {
            Write-Host " [OK] Manifest start_url: '$($ManifestJson.start_url)'" -ForegroundColor Green
        } else {
            Write-Host " [FAIL] Manifest start_url incorreto: '$($ManifestJson.start_url)'" -ForegroundColor Red
            $ErrorsCount++
        }
    } catch {
        Write-Host " [WARN] Não foi possível parsear o JSON do manifesto: $_" -ForegroundColor Yellow
    }
}

# 3. Testar Ícones Públicos
Write-Host "`n3. Verificando Assets de Ícones..." -ForegroundColor Cyan
Assert-Endpoint -Path "/icone.png" -Description "Ícone Oficial PWA"
Assert-Endpoint -Path "/logo.svg" -Description "Logo SVG Oficial"

# 4. Testar Rotas Públicas & SEO
Write-Host "`n4. Verificando SEO & Rotas Públicas..." -ForegroundColor Cyan
Assert-Endpoint -Path "/guia" -Description "Página Pilar Guia"
Assert-Endpoint -Path "/robots.txt" -Description "Arquivo Robots"
Assert-Endpoint -Path "/sitemap.xml" -Description "Sitemap XML"

Write-Host "`n======================================================================" -ForegroundColor Cyan
if ($ErrorsCount -eq 0) {
    Write-Host "  RESULTADO: HOMOLOGADO PWA COM SUCESSO (0 ERROS)" -ForegroundColor Green
} else {
    Write-Host "  RESULTADO: FALHA NA HOMOLOGAÇÃO ($ErrorsCount ERROS ENCONTRADOS)" -ForegroundColor Red
}
Write-Host "======================================================================" -ForegroundColor Cyan
