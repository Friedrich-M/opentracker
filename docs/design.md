# Dashboard design

The dashboard adapts opencode’s v2 documentation design. Preserve its existing visual language when adding screens; the goal is a coherent application rather than a different style for each feature.

## Styling

Keep the vendored stylesheet and its MIT notice intact. Adapt the dashboard in `src/app/global.css`, with selectors scoped to the relevant component. Zen utilities are layered, so an unlayered rule can override them across the application; check the affected states before widening a selector.

Use the existing theme and chart tokens. Frames, aligned cells and restrained typography form the layout; avoid introducing rounded cards, shadows or unrelated colors. Pixel wordmarks follow the existing glyph system. Both themes must remain readable, and the initial appearance follows the system unless the user has chosen one.

## Interaction and language

Use semantic controls, keyboard access, visible focus and meaningful labels. Check empty, loading and error states alongside populated data. Long website names, URLs and organization labels must not force horizontal overflow on a phone.

Update English and Simplified Chinese together. Write Chinese naturally for 你; retain established terms such as 会话, 访客, 来源, 入口页, 分群, 两步验证 and 热力图. Use the application’s locale-aware date formatting rather than hard-coded date strings.

## Verification

Use the [local-preview workflow](../.claude/skills/opentracker-local-preview/SKILL.md) with a disposable database. Check both themes, both languages, keyboard navigation and phone width. Screenshots illustrate appearance; also exercise the changed controls and inspect browser errors. Keep public images synthetic and temporary captures ignored.
