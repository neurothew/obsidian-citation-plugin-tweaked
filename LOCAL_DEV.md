# Local development

This checkout is the TypeScript source for the old Citations plugin.

The playground vault loads the development copy from:

`../ObsidianPluginPlayground/.obsidian/plugins/obsidian-citation-plugin-dev`

After editing files in `src/`, rebuild and install the dev copy with:

```powershell
powershell -ExecutionPolicy Bypass -File .\build-dev.ps1
```

If `node_modules` is missing, install the locked JavaScript dependencies with:

```powershell
powershell -ExecutionPolicy Bypass -File .\install-deps.ps1
```

After installing Node.js on Windows, open a new PowerShell window before checking `node -v` or `npm -v`; older terminal sessions may not see the updated PATH.

Use `package-lock.json` as the source of truth for dependencies. The plugin depends on an old pinned Obsidian API snapshot; fresh dependency resolution can pull modern Obsidian types and break the build.
