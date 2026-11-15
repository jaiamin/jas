import type { Evidence, RunDetail, StudyDetail, Usage } from "@/lib/types";

export interface PublicationDescription {
  title: string;
  finding: string;
  tags: string[];
  featured_run: string;
  visibility: "public" | "unlisted";
  notes: string;
  email_reviews: Record<string, string>;
}
export interface ScanFinding {
  path: string;
  rule: string;
  fingerprint: string;
  reviewable: boolean;
  resolved: boolean;
}
export interface ReplayResult {
  run_id: string;
  verified: boolean;
  verified_turns: number;
  reason: string | null;
  rule_version?: string;
}
export interface PublicationCard {
  id: string;
  title: string;
  finding: string;
  tags: string[];
  models: string[];
  world: string;
  author: string;
  slug: string;
  version: number;
  created: string;
  visibility: "public" | "unlisted";
  verified: boolean;
  featured: boolean;
  fork_count: number;
  sha256: string;
  url: string;
}
export interface PublicRecording {
  record: RunDetail;
  evidence: Evidence[];
  model_inputs: unknown[];
}
export interface PublicExperiment {
  format: "jas-public";
  version: 1;
  jas_version: string;
  created: string;
  description: PublicationDescription;
  experiment: Pick<
    StudyDetail,
    | "design"
    | "revision"
    | "sha256"
    | "created"
    | "runs"
    | "comparison"
    | "results"
  > & {
    limits: string[];
    usage: Usage;
    headline: {
      metric: string | null;
      cells: StudyDetail["comparison"]["cells"];
    };
  };
  lineage: {
    author: string;
    slug: string;
    version: number;
    sha256: string;
  } | null;
}
export interface PublicManifest extends PublicExperiment {
  publication: PublicationCard;
  verification: ReplayResult[];
  runs: { id: string; sha256: string }[];
  forks: PublicationCard[];
}
export interface PublicationReview {
  sha256: string;
  bytes: number;
  scan: ScanFinding[];
  verification: ReplayResult[];
  record: PublicExperiment & { runs: PublicRecording[] };
}
export interface PublishingStatus {
  origin: string;
  identity: { handle: string; scope: string } | null;
  error: string | null;
  error_code?: "keychain_unavailable" | null;
}
