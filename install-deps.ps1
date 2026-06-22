$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$InstalledNodeDir = "C:\Program Files\nodejs"
$InstalledNpm = Join-Path $InstalledNodeDir "npm.cmd"
$BundledNodeDir = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin"
$BundledNode = Join-Path $BundledNodeDir "node.exe"
$BundledPnpm = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\pnpm\bin\pnpm.cjs"

Push-Location $RepoRoot
try {
	$NpmCommand = Get-Command npm -ErrorAction SilentlyContinue
	if ($NpmCommand) {
		& $NpmCommand.Source ci --ignore-scripts
	} elseif (Test-Path $InstalledNpm) {
		& $InstalledNpm ci --ignore-scripts
	} elseif ((Test-Path $BundledNode) -and (Test-Path $BundledPnpm)) {
		$env:Path = "$BundledNodeDir;$env:Path"
		& $BundledNode $BundledPnpm dlx npm@10 ci --ignore-scripts
	} else {
		throw "npm was not found. Install Node.js/npm, then run npm ci --ignore-scripts in this folder."
	}
} finally {
	Pop-Location
}
