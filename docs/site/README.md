# Public JAS documentation

Source for https://jas.mintlify.site. Keep eight concise user-facing pages in
Start, Guides and Reference. Engineering contracts live in the parent docs/.
Use current app behavior and the product brief in `.mintlify/product-brief.md`.

## Preview and check

From this directory:

```sh
pnpm dlx mint@4.3.34 dev --port 18160
pnpm dlx mint@4.3.34 validate
pnpm dlx mint@4.3.34 broken-links
```

The MVP is currently on `t3/ponytail-full-1`. Remove the quickstart/README branch
pin after an approved merge; do not claim that package-registry release is complete.

## Publish

The existing `jas` site uses Mintlify artifact storage, not Git synchronization.
Local changes do not publish. Through the authenticated Admin MCP:

1. Read the target branch and existing content. Apply pages/navigation and upload
   their assets, keeping `docs.json` and this checkout consistent.
2. Inspect `status` and `diff`. Fix validation/navigation errors before publishing.
3. When publication is authorized, call `publish`; check `deployment_status` using
   its commit until `live` is true. Verify live routes, links, themes and phone layout.

Publish only the eight MDX pages, `docs.json`, referenced images and fonts
(including their license). README and `.mintlify/product-brief.md` are contributor
context. Keep the existing site, Git source and auth settings unless separately
authorized. Never store credentials here.

The app links to `/` and `/integrations/jas-mcp`; keep those paths stable.
JAS MCP is Coming soon. Mintlify's `/mcp` searches documentation, not a local workspace.
Header SVGs outline the app's upright Allo Playful JAS wordmark, with the same
pixel icon, proportions and tracking. Interface text uses the locally
hosted Allo Friendly variable font. Its source and OFL license live in `fonts/`;
`docs.json` selects the family and source. README banners reuse the app's
pixel-cloud renderer and the same brand in both themes, at a compact 6:1 ratio.
