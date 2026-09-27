# MCP Windows Desktop Automation

A trusted-owner MCP server for an interactive Windows x64 desktop. Version 2 retains the original 50 AutoIt tools and seven prompts, adds actual PNG screenshots, and supports MCP 2026-07-28 through SDK 2.0.0. Explicit compatibility serves legacy 2025-11-25 clients.

## Run

Requires Node.js 22 or newer. Install this repository or its reviewed release artifact, then run the installed command:

```sh
npm ci
npm run build
node dist/index.js --transport=stdio
# After installing the package:
mcp-windows-desktop-automation --transport=stdio
```

Stdio stdout contains only MCP JSON messages. Diagnostics, including verbose operation names, go to stderr without argument values. Closing stdin closes the server and its native helper.

Native operations require Windows x64 and the logged-in user's interactive desktop. Enumeration and protocol handling also run on Linux, where native calls return an explicit platform error. ARM64, services in session 0, headless Windows sessions, other users' sessions, and elevated windows beyond the server's privileges are not supported. No provider account or model is involved.

## Transports and ownership

Stdio is the default. For HTTP, set:

- `MCP_AUTH_TOKEN`: a random owner bearer token of at least 32 characters.
- `MCP_FILE_ROOTS`: a JSON array of existing local directories, for example `["C:\\Users\\me\\Documents"]`.
- Optional `MCP_ALLOWED_HOSTS`: comma-separated exact Host values, including port when used.
- Optional `MCP_ALLOWED_ORIGINS`: comma-separated exact origins.

Then launch `mcp-windows-desktop-automation --transport=streamable-http --port=3000`. The endpoint is `http://127.0.0.1:3000/mcp`; `--host=ADDRESS` explicitly changes the loopback default. Authorization is required for every endpoint request. Host and Origin are checked exactly; forwarded headers are not trusted, and permissive CORS is not enabled. Use a trusted TLS reverse proxy for remote deployment.

This is one owner per process, with one shared desktop, clipboard, native options, and serial command queue. Every client holding that token has the same broad OS permissions, including process launch, credentials passed to runAs, and shutdown. Deploy a separate Windows account/session/process for separate owners. File roots constrain the file resource only; automation tools are not an OS sandbox. This private bearer deployment does not implement OAuth or claim multi-tenant authorization.

HTTP supports current Streamable HTTP and deliberate stateless legacy requests. Current clients must send the standard matching MCP protocol, method, and name headers. There is no historical SSE session endpoint. The previous `--transport=websocket` branch was a nonfunctional placeholder; it now fails with a migration message instead of claiming WebSocket support.

## Retained tools and prompts

| Group | Tools |
| --- | --- |
| Mouse | mouseMove, mouseClick, mouseClickDrag, mouseDown, mouseUp, mouseGetPos, mouseGetCursor, mouseWheel |
| Keyboard and clipboard | send, clipGet, clipPut, autoItSetOption, opt, toolTip |
| Windows | winActivate, winActivateByHandle, winActive, winClose, winExists, winGetHandle, winGetPos, winGetText, winGetTitle, winMove, winSetState, winWait, winWaitActive, winWaitClose |
| Controls | controlClick, controlClickByHandle, controlCommand, controlGetText, controlSetText, controlSend, controlFocus, controlGetHandle, controlGetPos, controlMove, controlShow, controlHide |
| Processes | run, runWait, runAs, runAsWait, processExists, processClose, processSetPriority, processWait, processWaitClose, shutdown |
| Screenshot | takeScreenshot |

Prompts: findWindow, windowInfo, fillForm, submitForm, automateTask, monitorWindow, takeScreenshot.

The existing AutoIt argument conventions remain. Strings and integers now have explicit limits. Wait timeouts are **seconds**, default 10 and range 1–25; the old process-timeout description incorrectly said milliseconds. Click counts are capped at 100. Text getters use a fixed UTF-16 buffer (default/max 65,536 code units); an undersized buffer reports an error instead of silently truncating or allocating indefinitely.

## Actual screenshots and file resources

`takeScreenshot` returns MCP `image/png` content:

- `{ "target": "fullscreen" }`: visible pixels across the virtual desktop.
- `{ "target": "window", "windowTitle": "..." }`: AutoIt window selection with Win32 PrintWindow.
- `{ "target": "region", "x": 20, "y": 20, "width": 100, "height": 80 }`: a rectangle wholly inside the virtual desktop.

Resources expose `screenshot://desktop` and `screenshot://window/{percent-encoded-title}`. These replace the old text-only screenshot placeholder. Capture uses the bundled static Windows PowerShell script; request data enters through JSON stdin. No capture is saved to disk. PNGs are limited to 32 million pixels and 8 MiB, with a 15-second helper deadline. PrintWindow support varies by application; protected, minimized, or hardware-rendered windows may reject capture or produce blank pixels. Capture does not activate a window.

`file:///` URIs read local files or directory listings inside canonical configured roots. Stdio defaults roots to its working directory; HTTP requires explicit roots. Files must be regular and at most 1 MiB and return base64 binary resource content; directories return up to 1,000 names. Network-host file URIs and symlink escapes are rejected. This intentionally replaces the original unbounded file access.

## Cancellation and shutdown

One owned native helper isolates the AutoIt DLL from the MCP event loop. At most 16 tool/resource jobs are queued; each desktop request has a 30-second total deadline. Native options persist until the helper stops. Cancellation, timeout, or a native crash interrupts that helper; a subsequent request starts a fresh one with default options. Interrupted mutations are never replayed. Already-applied desktop changes are not undone, and applications intentionally started through run/runAs are not killed automatically.

Cancellation works on the active stdio request, including numeric request ID 0. For stateless legacy HTTP, closing the active response cancels that request; a separate legacy cancellation notification cannot address another request. Stopping the server prevents worker restart and closes transport connections.

## Development and evidence

```sh
npm run check
npm run test:package
npm audit --omit=dev --audit-level=high
```

CI runs Node 22 and 24 on Linux and Windows. Windows jobs require actual AutoIt calls against a uniquely owned WinForms fixture, Unicode control and clipboard round-trips, bounded text, screenshot pixel checks, cancellation, and helper cleanup. Linux jobs explicitly skip only that platform-specific native fixture. Both platforms test actual modern and legacy wire messages, private HTTP boundaries, concurrent overlapping client IDs, file-root escapes, installed package executables, clean stdout, and EOF.

No test invokes shutdown, runAs, or arbitrary applications. The native fixture restores clipboard text and closes only its owned window. Windows desktop behavior is verified in a disposable runner; compatibility with every third-party desktop application still depends on that application's controls and privileges.

The SDK migration follows [the official v2 guide](https://ts.sdk.modelcontextprotocol.io/v2/migration/upgrade-to-v2) and [2026 protocol guide](https://ts.sdk.modelcontextprotocol.io/v2/migration/support-2026-07-28). Native automation uses [node-autoit-koffi](https://github.com/nullmastermind/node-autoit-koffi), with bounded calls to the bundled AutoIt DLL. Screenshots follow Microsoft's [PrintWindow](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-printwindow) and [CopyFromScreen](https://learn.microsoft.com/en-us/dotnet/api/system.drawing.graphics.copyfromscreen?view=windowsdesktop-10.0) APIs.
