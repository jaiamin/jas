# Public JAS documentation

Mintlify source for https://jas.mintlify.site. Keep product guides concise and
based on implemented behavior. Engineering contracts remain in the parent docs/.

From this directory, preview and validate with the maintained Mintlify CLI:

```sh
pnpm dlx mint@4.3.34 dev --port 18160
pnpm dlx mint@4.3.34 validate
pnpm dlx mint@4.3.34 broken-links
```

The public site currently uses Mintlify artifact storage. Updating this directory
does not automatically publish it. Upload these files through an authenticated
Mintlify editing session, or configure a Git source pointing at `docs/site`.
Preserve the current site until the replacement has been validated and reviewed.

The app's Docs link targets the public root. JAS MCP targets
`/integrations/jas-mcp`; keep that path stable. `/mcp` is Mintlify's own endpoint,
not the planned JAS workspace server. Never add keys or OAuth credentials here.
