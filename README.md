# Email QA Studio — Workspace 04

Extract the ZIP and open **Email_Template_QA_checker.html**. This is the complete standalone tool, including all styles, scripts and the capture library. Alternatively open `index.html`, keeping its accompanying files in place. No server or installation is required.

## Start here

1. Open an HTML file or use **Go to editor** to paste source. **Load sample** provides an example with intentional issues.
2. Select **Run full QA** on Overview. Safe code fixes go into the output; original input is retained. Desktop and mobile visual checks start automatically.
3. Review errors and manual findings in **QA CHECKLIST**.
4. Inspect desktop/mobile rendering in **PREVIEW REVIEW**. Select an issue to highlight its element, read source context and expand its PNG snapshot.
5. Open **CODE COMPARE**, then **Use input → output** to review changes.
6. Download corrected HTML from the editor/checklist toolbar, or **Download QA bundle** from Overview.

Tab navigation does not modify code. Runs happen only through the check buttons. Opening an HTML file retains the original formatter's automatic format/check behaviour.

## Six workspaces

### Overview

Actual counts for errors, fixes, review items and visual candidates; a single full-QA action; the last five source runs held only in memory; manual workspace save/open; and export of a ZIP containing `original.html`, `reviewed.html`, `qa-report.json`, a printable `qa-report.html` and a short README. Visual PNGs are downloaded separately from Preview Review. Pending/stale visual reports are identified as unavailable in the bundle. Comparison summaries specify their basis because arbitrary source versions may have been compared.

**Save workspace** creates a local JSON file containing source, output, relevant settings and comparison inputs. **Open workspace** restores that file and requires a fresh QA run before exporting a new static report. There is no automatic source persistence. Loading a sample, restoring a saved workspace or loading run-history source asks before overwriting nonempty input.

### Format & Check

The existing formatter, copy/download actions, indentation and theme controls remain available. This engine has its own existing fix settings. Checklist fixes are separate and conservative.

### QA Checklist

64 rule categories including the screenshot checklist, HTML attribute case, background spelling/colour syntax, duplicate attributes, duplicate IDs, invalid colours and unsafe link protocols. Before/after fixes, input/output line references, search, status filters, audit-only mode, undo and report export are included. Editing input/settings or changing the output invalidates stale results.

`Bgcolor` / `bgColor` become `bgcolor`; values are preserved. Case-sensitive SVG/MathML and namespaced attributes are excluded. `backgorund: #fff:;` and colour-only `background: #fff;` become `background-color: #fff;`. Layered/image backgrounds are preserved. Invalid colours such as `#colors` are flagged without inventing replacements. Conflicting duplicate attributes/IDs require review.

The layout-table option assumes unmarked email tables are layout tables except those with detected data-table indicators. Turn it off for unknown/mixed documents. Existing alt text is retained; meaningful missing alternatives require author input. Footer colours and dates use generic approved-design guidance. Requirements, Figma comments, image artwork, live redirects and ambiguous code changes require manual sign-off; they never count as automatic passes.

### Preview Review

A single focused device canvas with desktop/mobile switching, fit/100%/75%/50% zoom, original/current-output selection, a searchable issue inspector, source context, live element highlighting, downloadable issue/full-preview PNGs and a visual JSON report. Advanced settings are collapsed by default. A running review can be cancelled; new output invalidates older visual results.

Checks cover horizontal overflow, unavailable images, text under 10px and low-contrast candidates on identifiable solid backgrounds. Findings are review candidates, not automatic layout fixes. Rendering uses a sandbox; scripts, navigation, forms, external stylesheets and active embedded content are disabled. Remote preview images load only when enabled. No source is uploaded.

Captures use the bundled html2canvas renderer, not native Outlook/Gmail engines. Some CSS is unsupported; remote images without CORS permission can appear live but be omitted from PNGs. VML and email-client-specific behaviour need real-client testing. Captures are capped at 1400px width / 6000px height, with out-of-capture findings labelled. At most 60 findings are collected per viewport to limit duplicate noise. A timeout, slow asset or blocked image can produce an unavailable-image finding. Design matching still requires a person.

### Code Compare

Collapsible source editors with line gutters and file upload, two aligned syntax-coloured panes, synchronized scrolling, added/removed/changed lines, inline edit highlights, change-group navigation, collapsible unchanged context, wrapping, swap and text export. The results take centre stage after a comparison.

Exact source comparison is the default. Browser textareas normalize CRLF to LF; trailing blank lines remain significant. **Ignore whitespace** is optional. **Format for comparison** formats temporary copies without changing either editor; line numbers then refer to those formatted copies, as the status explicitly states. **Collapse unchanged** keeps context around changes; click a collapsed row to expand it. Large rewrites may use a labelled full replacement for responsiveness. This is a review tool, not a merge editor.

### Assets & Links

Search/filter inventory of image sources, alt text, declared dimensions, link destinations, targets and line numbers. Missing URLs, URL whitespace, relative/template URLs, missing alt and target issues are flagged. Inventory uses the selected source version and does not request URLs or certify redirects. Export is JSON.

## Included files

- `Email_Template_QA_checker.html`: standalone app
- `index.html`, `style.css`, `javascript.js`: main app
- `qa-checklist.js`, `qa-checklist-ui.js`, `qa-checklist.css`: baseline checklist engine/UI
- `qa-deep-checks.js`: extended checks, fix guard and final-output revalidation
- `qa-issue-center.js`, `qa-issue-center.css`: prioritized review queue and printable report
- `code-compare.js`: diff engine/workspace
- `preview-review.js`: isolated preview diagnostics/captures
- `qa-studio.js`, `qa-studio.css`: dashboard, inventory, exports and redesigned layout
- `vendor/html2canvas.min.js`: MIT-licensed capture renderer; original notice retained
- `tests/regression.cjs` and `tests/deep-checks.cjs`: base and extended engine regression tests; run with Node.js

## Validation

Both entry points were tested in Chromium for dashboard flow, 64 rule categories, live preview and issue selection, PNG downloads, aligned wrapped diff rows, navigation, inventory, workspace/bundle export and mobile-width layout. ZIP CRC/content validation and 500 randomized diff reconstruction cases passed. Native email-client rendering and Firefox were not tested here.

Additional checks passed for workspace restoration, expanding unchanged diff regions, source preservation in formatted comparison, sandbox script blocking, cancelled preview runs and stale-report invalidation. Wrapped diff lines retain matching heights on both sides. Static regression tests are included; browser integration tests were run during packaging.


## Workspace 04 — QA review improvements

The checklist now opens a review center instead of a long list of expanded cards. Findings are organized by priority, category, status and source/output line. Use search and filters, then select an issue to see its explanation, code and before/after fix evidence. Source panes collapse after a run; **Show source & output** or a finding's line button opens them again. Arrow keys navigate a focused issue queue.

Use **Check coverage** to see all 64 rule categories and the limits of the current run. **No finding** means the implemented detector did not identify an issue; it does not certify the entire email. Document mode can be Auto-detect, Full email document or HTML fragment. Document-only checks are not applied to fragments. Browser CSS property/value validation is only available where CSS.supports exists; the report discloses this.

Additional checks include document structure/doctype/encoding/language/viewport, tag nesting, table children, repeated document sections, CSS syntax/property spelling/units, linked CSS, active content/event handlers, image sources/formats/dimensions, link names and fragment targets, placeholders, hidden content, media query dimensions, HTML size, preheader/unsubscribe review, headings, form controls, embedded assets and conditional/comment boundaries. `RULES.md` lists the categories.

Safe fixes now include known attribute/property misspellings and explicit noopener relationships. The engine rechecks the final output and retains a fix history, so repaired findings are not incorrectly left in the open-error list. It follows chained safe corrections for up to four passes, then reports remaining issues. Known malformed quotes, CSS delimiters or comments pause all automatic fixes for that run. Structural nesting is reported but not automatically rewritten. Optional HTML end tags, SVG/MathML case, legacy CSS hacks, entity-encoded styles and split Outlook conditional wrappers are handled conservatively. Outlook branch internals and unresolved template expressions still require rendered-sample review.

For a **Review** finding you can record a note and mark it reviewed, or reopen it later. This is a manual decision, never an automated pass. Errors cannot be dismissed this way. Notes appear in the current JSON/printable reports and QA bundle. A new run or input/settings change invalidates previous manual decisions. Workspace JSON restores editing state, not manual approval; export your report/bundle before starting another run.

**Printable report** downloads a self-contained HTML report with error/fix/review counts, code evidence, decisions, coverage and the latest available visual findings. Open it and use Print / Save PDF. PNG captures are exported separately. The QA ZIP now includes this printable report alongside the JSON and HTML versions.

No automatic checker can detect every design discrepancy, delivery issue or client-specific rendering problem. Live redirection, final MIME headers, campaign requirements, artwork/Figma accuracy and actual Outlook/Gmail rendering remain explicitly outside automatic approval.

### Workspace 04 validation

Both entry points were tested in Chromium for the 64-rule audit/fix workflow, final-output revalidation, decision notes, coverage filters, printable/JSON reports, preview captures, diff, ZIP export and mobile layout. Valid-document and malformed-input fixtures verify conservative behaviour; regressions cover optional table end tags, comments, entity-encoded styles, template/conditional boundaries, exact source retention during audit and repeat-run stability. Fix suppression on malformed syntax is tested. The base diff's 500 randomized reconstruction tests also pass. Firefox and native email-client rendering are not certified by these tests.
