# Workspace interface refinement

Latest user-approved refinements supersede the original MVP Home/navigation layout.
Keep the private workspace local; no paid calls, schema reset or deployment.

## Design intent

Preserve the white/graphite surfaces, Geist typography, outlined navigation, primary
Assistant Target and four original 3dicons. Keep evidence primary, with an optional
fixed-width Assistant. Compose existing buttons, popovers, confirmation dialogs,
scrollers and the shared conversation engine. No resizing or additional menus.

## Acceptance criteria

- [x] Remove Get started and its onboarding-only writes; retain four equal illustrated
      Experiment ideas with icon-matched copy and symmetric 16px horizontal padding.
- [x] Home, Gallery, then Workspace navigation; Gallery contains Browse/My published.
      No Assistant navigation item or Community group.
- [x] Narrow expanded navigation to 240px; retain the 48px rail and mobile menu.
      Its 16px panel icon points inward when expanded and outward when collapsed.
- [x] Remove dividers below JAS and above usage, retaining the navigation divider.
      Give expanded usage a soft gray surface, clearer border/label, 12px padding
      and a quiet hover state. Keep usage hidden when
      collapsed and prevent text reflow during expansion; accounting is unchanged.
- [x] Keep the outlined Assistant toggle before theme, absent on Home/Assistant,
      with equal 10px horizontal padding and vertically aligned 16px glyphs.
- [x] Place the fixed 440px pane beside the global header, extending to the top.
      Both headers are 52px tall. The pane pushes wide-screen content and fills
      the available main area below 1280px, without a resize control.
- [x] Match the left navigation’s 200ms linear width animation in both directions.
      Keep inner content at its final width; disable motion for reduced-motion
      users. Closed content is inert/hidden, and explicit closing restores focus.
- [x] Toolbar: truncated chat-name history, four-corner Maximize focus link,
      SquarePen new chat and PanelRightClose. Use 16px glyphs, 28px targets and
      2px action gaps. Keep full titles accessible without full-title tooltips.
- [x] Restore the static Assistant Target before What can we explore?, with a 6px
      text gap. Align its leading edge and suggestions to the composer text inset.
      Preserve the bottom composer, unboxed pane suggestions and shared chat engine.
- [x] Opening stays manual after navigation, Back and reload; remember chat/draft
      identity without saving or restoring the open state.
- [x] Always offer Add context; auto-select only an individual experiment/run with
      its displayed revision/cutoff. Preserve manual selection and page filters.
- [x] Preserve pending acceptance, draft identity and late-response guards; focusing
      reconnects without resubmission. Opening never incurs a provider call.
- [x] Add separately focusable trash actions and explicit deletion confirmation,
      with pending/busy/error/retry states. Clear matching identities after success.
- [x] Delete terminal chats transactionally; reject live/pending turns and calls,
      and proposals referenced by saved revisions. Keep usage, tokens, costs and
      unknown reservations; clear raw prompts/responses without a schema change.
- [x] Recheck existing chat identity after asynchronous context capture so a deleted
      chat cannot be resurrected or trigger a provider call.
- [x] Verify backend, frontend and browser behavior with disposable keyless data.
- [x] Save the checkpoint to the existing draft PR; leave the local app on 8080.

## Verification

- 82 affected backend tests passed; Ruff, formatting and ty passed.
- Frontend lint/build and all 150 unit tests passed.
- All 87 affected browser cases verified across runs. The final 28 pane/navigation
  cases passed after the latest refinements, including 390px/light/dark layouts,
  measured alignment, reduced motion, pending handoff, manual opening, deletion
  recovery, directional icons and usage hover/animation. Focused Agent checks
  passed separately; Home, execution, matched results and recovery also passed.
- Four additional usage checks passed after the final visual adjustment.
- The mechanical design detector reported no findings in changed UI surfaces.
- Manual desktop/light and phone/dark browser inspection passed without overflow
  or console errors. The local app was refreshed on 0.0.0.0:8080; health is 200
  and the existing workspace is intact. No model calls or deployment occurred.

## Decisions

Saved revision provenance is immutable, so chats supplying their proposals cannot
be deleted. Explain the dependency in the deletion error instead of removing
source evidence or adding a hidden-conversation storage contract. Per-record/
revision conversation slots and one general slot preserve existing identities;
remembering a chat never restores the pane’s open state.
