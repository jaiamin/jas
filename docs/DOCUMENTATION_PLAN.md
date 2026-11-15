# Documentation and Learn navigation

## Scope

Connect the public JAS documentation at https://jas.mintlify.site and replace its
Mintlify starter content with concise product guides. Preserve the local workspace,
existing data and port 8080. No app deployment, paid model calls or v0.2 features.

## Acceptance criteria

- [x] Add an outlined Docs link before Assistant in the global header.
- [x] Add Learn below Workspace: Docs, JAS MCP and Examples. Docs and JAS MCP
      open the specific public documentation pages in new tabs and show a trailing
      ArrowUpRight. Preserve collapsed tooltips, mobile navigation and focus.
- [x] Examples lists the six existing scripted recordings with Watch and Use
      actions; opening or reusing an example never starts a run. Preserve Home's
      four illustrated Experiment ideas.
- [x] Prepare JAS branding and a restrained Mintlify layout, with short installation,
      experiment, evidence, provider, sharing and reference guides based on the
      implemented contracts. Keep package publication and provider costs accurate.
- [x] JAS MCP source explicitly says Coming soon: JAS has no workspace MCP server yet.
      Do not confuse Mintlify's documentation/admin MCP with a JAS runtime server.
- [x] Validate documentation links/configuration and browser flows in both themes,
      desktop and phone layouts. Run affected frontend checks and preserve 8080.
- [x] Record observed hosting access, publication status, verification and any
      remaining external dependency in HANDOFF.md.
- [ ] Publish the validated source to the existing Mintlify site and verify the
      public JAS MCP page. This requires authenticated site-editing access.
- [x] Refine the Assistant pane: 18px welcome heading, 22px Target and 24px space
      below suggestions. Keep focused chat styling and composer spacing intact.

## Findings and decisions

- The supplied public URL is https://jas.mintlify.site. Its current pages are the
  unmodified Mintlify starter kit; the public metadata identifies artifact-backed
  hosting, rather than a GitHub content repository.
- The requested `codex mcp add mintlify --url https://mcp.mintlify.com` succeeded,
  including OAuth sign-in. This configures the local client; the current session
  exposes no Mintlify tools. Gateway discovery also has no Mintlify server.
  A direct initialization returned Cloudflare 403 and was not retried. The normal
  web editor and maintained CLI require their own sign-in; neither has site access.
  Do not create another site, replace the existing artifact registration, inspect
  credentials, or bypass the blocked endpoint.
- Examples describes both watching a recorded demonstration and reusing its
  starting protocol more clearly than Templates. Keep one destination and no
  extra filters for six entries.

## Next steps

Finish affected browser verification and save the checkpoint. When authenticated
editing access is available, upload docs/site to the existing site or configure
that directory as its Git source. Until then, the app's exact Mintlify destination
URLs are configured, but the new public content and JAS MCP page are not published.
