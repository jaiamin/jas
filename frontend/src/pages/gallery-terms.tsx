export default function GalleryTerms() {
  return (
    <article className="prose max-w-prose space-y-6 text-sm leading-relaxed">
      <h1 className="text-3xl font-semibold">Gallery terms & reporting</h1>
      <p>
        Publish only material you have permission to share. Review all agent
        prompts, outputs and private observations. Do not publish real
        credentials, personal data without consent, private model reasoning,
        unlawful content or executable attacks. Model transcripts may contain
        offensive material; publication is not endorsement.
      </p>
      <p>
        Keep findings accurate and state their limits. A replay badge means
        recorded actions reproduce states under recorded rules. It does not
        establish scientific validity, model identity, human behavior or
        repeatable model choices.
      </p>
      <p>
        Publishing needs a GitHub account at least seven days old. Each account
        may publish ten versions a day, up to 25 MB each. Public records appear
        in discovery; unlisted records are readable by anyone with the link and
        are excluded from discovery and indexing.
      </p>
      <p>
        Published versions are immutable. Authors may unpublish. JAS stops
        serving the page, data and social card, and removes discovery entries. A
        minimal author/version/hash tombstone remains for lineage and abuse
        handling. Copies already downloaded or held in external caches cannot be
        recalled.
      </p>
      <p>
        The project owner initially curates the gallery and handles reports and
        takedowns. Use Report this publication on a record. For urgent privacy
        or security issues, use the repository's private security reporting
        channel. Operators may remove content or revoke tokens for abuse.
        Reports stay in a private operator queue.
      </p>
      <p>
        Check your model provider's current terms before sharing its outputs.
        Keep backups: the service is offered without a guarantee of
        availability. Downloaded records include their protocol and evidence for
        independent replay.
      </p>
      <a
        href="https://github.com/jaiamin/jas/security/advisories/new"
        className="underline"
      >
        Private security report
      </a>
    </article>
  );
}
