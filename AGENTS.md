    <!-- UniERP-Agent-Protocol: 1.1.0 -->
    # desktop-app agent rules

    This is the only repository agent instruction file. Read [the workspace entrypoint](../AGENTS.md),
    the [canonical protocol](../platform/docs/standards/AI_AGENT_DEVELOPMENT_PROTOCOL.md),
    the enterprise brain, applicable accepted ADRs and the owning platform requirements before
    material work. Follow authority precedence; this file narrows implementation behavior only.
    If a required authority is missing, stop before mutation.

    **Layer:** L5. **Accountable platform:** PLT-DESK. **Scope:** Desktop shell and native integration.
    Resolve actual dependencies, packages and scripts from current manifests and the platform catalog.
    Preserve unrelated changes. Define numbered acceptance criteria and a knowledge delta before editing.
    For coordinated changes, publish the change contract, validate upstream first, and hand off
    to downstream consumers with exact evidence.

    ## Repository rules

    - Consume published contracts and keep native OS access behind typed, audited Tauri commands; the renderer gets no unrestricted native authority.
- Store credentials in native secure storage. Prove signing, updates, offline state and recovery before claiming desktop support.
- Follow approved cross-platform tokens and verify supported keyboard and accessibility paths.

    ## Verification

    Run applicable commands from this repository, plus risk-specific contract, security, data,
    accessibility, integration, migration or release gates required by the canonical protocol:
    pnpm tauri:build; node ../platform/workspace/scripts/check-layer.mjs

    A command's presence here is not proof that it ran. Report exact results, failures and NOT RUN
    reasons; review the diff; then follow the canonical status and source-control procedure.
