# Student Overview Frontend

This frontend hosts the mock-only Student Overview prototype for `/students/:studentId`.

## Run

```bash
cd /Users/aukyjl/Projects/Web/projects/chess-coach-copilot
npm run dev:fe
```

## Verify

Open the real student route in local development:

- `/students/demo-student?scenario=populated`
- `/students/demo-student?scenario=loading`
- `/students/demo-student?scenario=section-error`
- `/students/demo-student?scenario=overview-error`

Switch through the remaining canonical scenarios with the development-only scenario control.

## Visual Review Workflow

Review against:

- `docs/product/screens/student-overview.md` for product semantics
- `docs/product/design/references/student-overview/student-overview-approved-reference.png` for palette and layout direction

Acceptance pass:

1. Check `1440px`: four summary cards, visible Performance Trend, distinct Progress Insight, prominent Recent Games rail, compact context cards.
2. Check `1024px`: Recent Games stays early in reading order, tabs remain scrollable, loading and error geometry hold.
3. Check `390px`: mobile navigation replaces the sidebar, no horizontal overflow appears, dialogs fit the viewport, cards and tabs remain usable.
4. Verify palette fidelity for `#F5F5F3`, `#FFFFFF`, `#EEEEEC`, `#F8F9FA`, `#F4F5F7`, `#202124`, `#66686D`, `#92949A`, `#586A8A`, `#485A79`, `#667386`, `#27303C`, and `#DEDEDB`.
5. Verify there are no live `/api/*` requests in any scenario.
