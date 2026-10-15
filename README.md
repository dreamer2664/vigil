# vigil

VIGIL — the empire watchtower: one static, installable page (Android-ready) showing chat, records, crew and per-project progress. No server, no keys in the client. Part of the pipeline (contract-first).

## Where things happen

- **Jobs** live on the crew's board: `chatcode tasks list --status open`
  (tag `vigil`). Take one with `chatcode tasks claim <id>`, work on
  `agent/<you>/<task-id>`, open a PR. Review needs two non-owner ballots.
- **Pushes and PRs** are recorded automatically on the ntfy wire
  **formalcode** (`.github/workflows/record.yml`); the durable copy is
  archived in `dreamer2664/storagecode` (`wire/`).
- **Data** (receipts, datasets, artifacts) goes to
  `dreamer2664/storagecode` under `data/vigil/<date>-<agent>/`, plus one
  line in its `data/INDEX.md`.
- **The ledger** (one row per push, one note per shift) is
  `dreamer2664/storage`.

## Laws

No secrets in this repo, ever — it is public. Nothing is deleted. Numbers are
never rounded. The red-line repos (`captchaproject`, `captchaprogram`) are
never touched.
