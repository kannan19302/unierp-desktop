<!-- UniERP-Agent-Protocol: 1.1.0 -->
# UniERP Repository Agent Entrypoint: Desktop Client (`desktop-app`)

This repository is one delivery unit in the UniERP polyrepo. Before analysis, planning, review, or mutation, every
AI agent from every provider MUST read and follow:

1. the workspace entrypoint at [`../AGENTS.md`](../AGENTS.md);
2. the canonical standard at
   [`../platform/docs/standards/AI_AGENT_DEVELOPMENT_PROTOCOL.md`](../platform/docs/standards/AI_AGENT_DEVELOPMENT_PROTOCOL.md);
3. the owning platform documents selected through
   [`../platform/docs/PLATFORM_CATALOG.md`](../platform/docs/PLATFORM_CATALOG.md).

If the workspace entrypoint or canonical standard is unavailable, the protocol bundle is incomplete. The agent
MUST stop before mutation and report the missing dependency. This bootstrap adds no weaker or conflicting rules.
Repository-specific additions may be appended below only when they narrow implementation behavior without
redefining platform ownership, security, contracts, or cross-platform standards.

---

## 1. Repository Identity & Mission

- **Repository**: `desktop-app`
- **Platform Owner**: `PLT-DESK` (Desktop Platform Operations)
- **Architectural Layer**: **Layer 5 (Desktop Shell)**
- **Runtime Port**: `4007` (Local dev server)
- **Mission**: Native cross-platform desktop shell (Tauri + Rust) for Windows, macOS, and Linux — offering hardware POS integration, local thermal receipt printing, biometric auth, and multi-window workspace environments.

---

## 2. Security & Sandboxing Guidance

1. **Tauri IPC Isolation**:
   - Webview context isolation; zero unrestricted Node.js runtime bindings in the renderer thread.
   - All native OS calls (filesystem, serial ports, printers) must pass through typed, audited Rust Tauri commands.
2. **Local Credential Storage**:
   - Windows Credential Manager / macOS Keychain integration for token retention.

---

## 3. Industrial Software Engineering Standards

1. **Lightweight & High-Performance**:
   - Memory footprint < 80 MB at steady state.
   - Fast cold start (< 800ms).
2. **Deterministic Builds**:
   - Web frontend and Tauri Rust core build cleanly without ad-hoc patch scripts.

---

## 4. Verification Gates & Mandatory Toolchain

Before declaring any cycle `DONE`, run and verify:

```powershell
pnpm typecheck              # Strict TypeScript verification
pnpm build                  # Desktop web bundle compilation
node scripts/check-layer.mjs # Canonical Layer Gate enforcement
```
