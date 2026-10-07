# Validação da Sprint 2 em produção (somente leitura). Rode no PowerShell:
#   powershell -ExecutionPolicy Bypass -File docs\seo\scripts\validate-sprint2.ps1
# Opcional: -Base https://www.conexaomaconica.com.br
param([string]$Base = "https://www.conexaomaconica.com.br")

$ErrorActionPreference = "Continue"
$script:fail = 0

function Check($ok, $label) {
  if ($ok) { Write-Host "  [OK]   $label" -ForegroundColor Green }
  else { Write-Host "  [FALHA] $label" -ForegroundColor Red; $script:fail++ }
}
function Get-Html($path) {
  try { return (Invoke-WebRequest "$Base$path" -UseBasicParsing -MaximumRedirection 0 -ErrorAction Stop).Content }
  catch {
    try { return (Invoke-WebRequest "$Base$path" -UseBasicParsing -ErrorAction Stop).Content } catch { return "" }
  }
}
function Get-Title($html) { $m = [regex]::Match($html, "<title>([^<]*)</title>"); return $m.Groups[1].Value }
function Get-Canonical($html) { $m = [regex]::Match($html, '<link rel="canonical" href="([^"]*)"'); return $m.Groups[1].Value }
function Get-Robots($html) { $m = [regex]::Match($html, '<meta name="robots" content="([^"]*)"'); return $m.Groups[1].Value }

Write-Host "== sitemap.xml"
$sm = Get-Html "/sitemap.xml"
$locs = @([regex]::Matches($sm, "<loc>([^<]*)</loc>") | ForEach-Object { $_.Groups[1].Value })
Check ($locs.Count -gt 0) ("sitemap lido: " + $locs.Count + " URLs")
Check (@($locs | Where-Object { $_ -notlike "https://www.conexaomaconica.com.br*" }).Count -eq 0) "todas as URLs usam www"
Check (@($locs | Where-Object { $_ -match "anunciar|pesquisa" }).Count -eq 0) "sem onboarding nem pesquisa"
Check ($locs -contains "$Base/guia/eventos") "inclui /guia/eventos"
Check ($locs -contains "$Base/guia/beneficios") "inclui /guia/beneficios"
Check (@($locs | Where-Object { $_ -like "*/eventos/*" }).Count -ge 1) "inclui evento publicado (/eventos/...) [exige a migration 201]"
$urlBlocks = [regex]::Matches($sm, "<url>.*?</url>", "Singleline") | ForEach-Object { $_.Value }
$homeBlock = $urlBlocks | Where-Object { $_ -match "<loc>$([regex]::Escape($Base))/</loc>" }
Check ([bool]$homeBlock -and ($homeBlock -notmatch "lastmod")) "home sem lastmod artificial"
$termosBlock = $urlBlocks | Where-Object { $_ -match "/termos</loc>" }
Check ([bool]$termosBlock -and ($termosBlock -notmatch "lastmod")) "/termos sem lastmod artificial"

Write-Host "== robots.txt"
$rb = Get-Html "/robots.txt"
foreach ($p in "/anunciante/", "/minha-conta/", "/auth/", "/c/", "/cadastro/", "/contratacao/", "/adesao/", "/admin/", "/diagnostics/") {
  Check ($rb -match [regex]::Escape("Disallow: $p")) "bloqueia $p"
}
Check ($rb -notmatch "Disallow: /anunciar") "NAO bloqueia /anunciar (o noindex precisa ser lido)"
Check ($rb -match "Sitemap: https://www\.conexaomaconica\.com\.br/sitemap\.xml") "aponta para o sitemap com www"

Write-Host "== canonical e titulos"
foreach ($p in "/guia/eventos", "/guia/beneficios", "/termos", "/privacidade") {
  $h = Get-Html $p
  $t = Get-Title $h
  Check ((Get-Canonical $h) -eq "$Base$p") "$p canonical com www"
  Check (([regex]::Matches($t, "Conexão Maçônica|Conex.o Ma..nica")).Count -le 1) "$p titulo sem marca duplicada ($t)"
}
$h = Get-Html "/guia/eventos?type=lojas"
Check ((Get-Robots $h) -like "noindex*") "/guia/eventos?type=lojas esta noindex"
Check ((Get-Canonical $h) -eq "$Base/guia/eventos") "/guia/eventos?type=lojas canonical da lista limpa"
$h = Get-Html "/register"
Check ((Get-Title $h) -like "Criar conta*") "/register titulo: $(Get-Title $h)"

Write-Host "== lojas (noindex enquanto o conteudo e fino)"
$lojas = Get-Html "/guia/lojas"
$lojaLink = [regex]::Match($lojas, 'href="(/guia/lojas/[^"]+)"').Groups[1].Value
if ($lojaLink) {
  $h = Get-Html $lojaLink
  Check ((Get-Robots $h) -like "noindex*") "$lojaLink noindex"
  Check ((Get-Canonical $h) -eq "$Base$lojaLink") "$lojaLink canonical com www"
} else { Write-Host "  (nenhuma loja encontrada para testar)" }

Write-Host "== slug com maiusculas"
$code = & curl.exe -s -o NUL -w "%{http_code}" "$Base/guia/OpticaCirculo"
$loc = (& curl.exe -sI "$Base/guia/OpticaCirculo" | Select-String -Pattern "^location:" -CaseSensitive:$false | ForEach-Object { $_.Line.Trim() })
Check ($code -eq "308") "/guia/OpticaCirculo responde 308 (recebeu $code)"
Check ($loc -match "/guia/opticacirculo") "redireciona para /guia/opticacirculo ($loc)"

$locUtm = (& curl.exe -sI "$Base/guia/OpticaCirculo?utm_source=teste" | Select-String -Pattern "^location:" -CaseSensitive:$false | ForEach-Object { $_.Line.Trim() })
Check ($locUtm -match "/guia/opticacirculo\?utm_source=teste") "redirect preserva o utm_source ($locUtm)"
$final = Get-Html "/guia/opticacirculo?utm_source=teste"
Check ((Get-Canonical $final) -eq "$Base/guia/opticacirculo") "pagina final com utm tem canonical sem parametros"
Check ((Get-Robots $final) -notlike "noindex*") "pagina final com utm segue indexavel"

Write-Host "== llms.txt"
$ll = Get-Html "/llms.txt"
$llUrls = @([regex]::Matches($ll, "https?://[^\s)]+") | ForEach-Object { $_.Value })
Check ($llUrls.Count -gt 5) "llms.txt lido: $($llUrls.Count) links"
Check (@($llUrls | Where-Object { $_ -notlike "https://www.conexaomaconica.com.br*" }).Count -eq 0) "todos os links com www"

Write-Host ""
if ($script:fail -eq 0) { Write-Host "SPRINT 2 VALIDADA: todas as verificacoes passaram." -ForegroundColor Green }
else { Write-Host "$($script:fail) verificacao(oes) com falha." -ForegroundColor Red }
