# Workspace interface refinement

User-approved changes supersede the original MVP Home/navigation layout. No
backend contract, paid execution, deployment or workspace data changes are planned.

## Design intent

A researcher moves between protocols, matched runs and recorded evidence. Keep the
workspace quiet like a research notebook: existing white/graphite surfaces, Geist
typography, muted metadata, primary Target glyph and the four soft 3dicons. The
page's evidence stays primary; an optional 440px Assistant pane provides related
help. Use existing buttons, popovers, tabs, scrollers and composer; 4px spacing
units, 16px pane gutters, one quiet divider and no resizing or decorative motion.
The chat-name dropdown opens history; its popup also offers the focused Assistant
view. Keep only New chat and Close at right, with no second collapse control. Preserve keyboard focus and mobile navigation.

## Acceptance criteria

- [x] Remove Get started and its obsolete onboarding-only state.
- [x] Restore all four illustrated idea cards with icon-matched copy, equal widths
      and symmetric 16px horizontal padding.
- [x] Home, Gallery, then Workspace navigation; no Assistant or Community group.
- [x] Gallery contains Browse and My published with usable empty/error states.
- [x] Outlined Assistant toggle immediately before theme, except Home/Assistant.
- [x] Fixed-width pane below the global header pushes desktop page content;
      narrow screens show the pane in the available main area. No resize control.
- [x] Bottom composer, unboxed suggestions and JAS welcome logo; chat-name history
      dropdown, new chat, focus link inside history and clear close action.
- [x] Always offer Add context; automatically select only an individual experiment/run,
      preserving displayed revision and cutoff. No URL/filter mutation from pane.
- [x] Preserve chat/draft identity across closing, navigation and late responses;
      reconnect pending turns without resubmission. Opening never incurs cost.
- [x] Expanded usage text remains stable throughout sidebar width animation;
      collapsed usage remains hidden, calculations/precision unchanged.
- [x] Relevant unit/browser checks, lint and build pass; desktop, phone and theme
      flows verified with keyless fixtures. Rebuild local 8080; do not deploy.

## Progress and decisions

- Investigation complete. Original illustrated cards recovered from Git history.
- Reuse AgentConversation and replace per-record modal panels with one shell pane.
- Keep per-record/revision identities, with a separate general conversation slot.
- Focus view opens the same conversation/draft in /assistant. Page context belongs
  to the current page; historical message context remains recorded per message.

## Verification

- Frontend lint/build and all 149 unit tests passed.
- All 83 affected browser cases passed on disposable keyless workspaces: Home,
  navigation, context/history, receipts, streaming, recovery, late responses,
  focused pending handoff, manual/automatic scope, drafts and recordings.
- Browser measurements verify equal 10px Assistant-toggle padding, shared vertical
  centers, equal 16px idea-cell padding/widths and stable usage during expansion.
- Manual desktop inspection verified the final pane and history popup on 8080.
- No backend/hosting contract changed. No paid provider calls or deployment.

## Completion

Implementation and verification are complete. Save the task branch and update the
existing draft PR. Keep the local app on 0.0.0.0:8080 with its workspace intact.
