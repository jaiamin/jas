# Separate public records from private workspaces

JAS retains one current internal workspace contract, but published links require
a durable, independently versioned public record. The user accepted a selected
frozen experiment version and its runs as the publication boundary, including
reviewed agent-private evidence and excluding assistant conversations, discarded
versions and raw researcher-provider traces; the broad internal export is not a
publication payload. Public record compatibility and retained verification rules
are an explicit exception to the internal no-compatibility policy, so a future
workspace change cannot silently break a published result.

The gallery is a separate public service with no model calls or provider keys.
Preserve the private runner and its data rather than exposing that workspace to
provide public replay. The gallery independently checks recorded transitions with
trusted, retained versioned JAS verifiers; it never executes uploaded code. Failed
or unsupported verification permits an unverified publication with explicit
reasons, rather than trusting a publisher-supplied verification claim.
