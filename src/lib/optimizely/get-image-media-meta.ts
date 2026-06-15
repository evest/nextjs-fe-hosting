import { getClient } from '@optimizely/cms-sdk';
// Ensures config() has run before getClient() (see graph-config.ts).
import '@/lib/optimizely/graph-config';

/**
 * Extra ImageMedia metadata (dimensions + file size) that the SDK's
 * getPreviewContent() does NOT return: `_assetMetadata` / `_imageMetadata` are
 * top-level ImageMedia fields, not part of the base-type fragments the preview
 * query builds, so they arrive undefined in the preview payload. The editor
 * ImageMedia preview fetches them separately, by content key, to fill those rows.
 *
 * Caveats:
 *  - This queries the INDEXED (published) copy via Graph. For an asset that
 *    isn't published/indexed yet the query returns no item → null, and the
 *    preview shows "— not set —" for these fields. Acceptable: width/height/
 *    fileSize are intrinsic to the uploaded file and don't change between draft
 *    and published, so they appear as soon as the asset is indexed.
 *  - Not cached: the editor preview must reflect current state, and this is a
 *    cheap single-item lookup only hit when an editor opens an image asset.
 *  - Never throws: a Graph failure degrades to null so the preview still renders.
 */

export type ImageMediaExtraMeta = {
  width: number | null;
  height: number | null;
  fileSize: number | null;
};

const QUERY = `
  query ImageMediaMeta($key: String!) {
    ImageMedia(where: { _metadata: { key: { eq: $key } } }, limit: 1) {
      items {
        _imageMetadata { width height }
        _assetMetadata { fileSize }
      }
    }
  }
`;

type RawItem = {
  _imageMetadata?: { width?: number | null; height?: number | null } | null;
  _assetMetadata?: { fileSize?: number | null } | null;
};

export async function getImageMediaMeta(key: string | undefined | null): Promise<ImageMediaExtraMeta | null> {
  if (!key) return null;
  try {
    const client = getClient();
    const data = (await client.request(QUERY, { key })) as {
      ImageMedia?: { items?: RawItem[] | null } | null;
    };
    const item = data?.ImageMedia?.items?.[0];
    if (!item) return null;
    return {
      width: item._imageMetadata?.width ?? null,
      height: item._imageMetadata?.height ?? null,
      fileSize: item._assetMetadata?.fileSize ?? null,
    };
  } catch (e) {
    console.error('[get-image-media-meta] graph lookup failed:', e);
    return null;
  }
}
