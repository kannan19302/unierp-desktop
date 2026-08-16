# AGENTS.md — unierp-desktop

> **You are working on a production enterprise platform intended to run real businesses for a
> decade. Not a prototype.**

## Read this first, in `unierp-workspace`

This repository carries **no** PRD, TRD, architecture doc, plan, or changelog of its own. There is
one governing set for the whole platform and it lives in the **`unierp-workspace`** repository:

- **[`AGENTS.md`](https://github.com/kannan19302/unierp-workspace/blob/main/AGENTS.md)** — the operating contract for every coding agent, whichever vendor
- `docs/ai/` — the ten governance documents (product, technical, flow, design, schema, standards)
- `docs/programme/` — the 310-phase development plan

## This repository's layer

**L5 — Clients**

> A repository may depend only on published artifacts of a strictly lower layer. Never
> sideways. Never upward.

## Every change

Append **one line** to `docs/ai/CHANGELOG.md` in `unierp-workspace`. It is the only channel
between you and the next agent, who will have no memory of this session.

## Licence

AGPL-3.0. Every dependency you add must be open source.
