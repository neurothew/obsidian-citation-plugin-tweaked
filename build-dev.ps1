$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = Split-Path -Parent $RepoRoot
$PluginDir = Join-Path $WorkspaceRoot "ObsidianPluginPlayground\.obsidian\plugins\obsidian-citation-plugin-dev"
$InstalledNode = "C:\Program Files\nodejs\node.exe"
$BundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

$NodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($NodeCommand) {
	$Node = $NodeCommand.Source
} elseif (Test-Path $InstalledNode) {
	$Node = $InstalledNode
} elseif (Test-Path $BundledNode) {
	$Node = $BundledNode
} else {
	throw "Node.js was not found. Install Node.js or run this from Codex with the bundled runtime available."
}

$RollupBin = Join-Path $RepoRoot "node_modules\rollup\dist\bin\rollup"
if (!(Test-Path $RollupBin)) {
	throw "Dependencies are missing. Run npm ci --ignore-scripts in this folder first."
}

Push-Location $RepoRoot
try {
	& $Node $RollupBin --config rollup.config.js
} finally {
	Pop-Location
}

New-Item -ItemType Directory -Force -Path $PluginDir | Out-Null
Copy-Item -LiteralPath (Join-Path $RepoRoot "main.js") -Destination (Join-Path $PluginDir "main.js") -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot "styles.css") -Destination (Join-Path $PluginDir "styles.css") -Force
Copy-Item -LiteralPath (Join-Path $RepoRoot "manifest.dev.json") -Destination (Join-Path $PluginDir "manifest.json") -Force

$DataPath = Join-Path $PluginDir "data.json"
if (!(Test-Path $DataPath)) {
	$OriginalDataPath = Join-Path $WorkspaceRoot "ObsidianPluginPlayground\.obsidian\plugins\obsidian-citation-plugin\data.json"
	if (Test-Path $OriginalDataPath) {
		Copy-Item -LiteralPath $OriginalDataPath -Destination $DataPath -Force
	}
}

Write-Host "Built and installed Citations Dev to $PluginDir"
