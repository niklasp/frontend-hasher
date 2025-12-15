/** Types of resources that can be collected */
export type ManifestEntryKind = "document" | "dom-asset" | "resource";

/** A single resource entry in the manifest */
export interface ManifestEntry {
  url: string;
  kind: ManifestEntryKind;
  hashSha256: string;
  sizeBytes: number;
  contentType: string | null;
  status: number;
  isSameOrigin: boolean;
}

/** The complete page manifest with all collected resources */
export interface PageManifest {
  manifestVersion: string;
  createdAt: string;
  pageUrl: string;
  origin: string;
  entries: Record<string, ManifestEntry>;
}

/** Result of fetching and hashing a resource */
export interface HashResult {
  hashSha256: string;
  sizeBytes: number;
  contentType: string | null;
  status: number;
}
