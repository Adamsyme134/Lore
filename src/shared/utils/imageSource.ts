export function normalizeImageUri(uri?: string | null) {
  const trimmedUri = uri?.trim();
  if (!trimmedUri) return undefined;

  try {
    return encodeURI(decodeURI(trimmedUri));
  } catch {
    return encodeURI(trimmedUri);
  }
}

export function imageSource(uri?: string | null) {
  const normalizedUri = normalizeImageUri(uri);
  return normalizedUri ? { uri: normalizedUri } : undefined;
}
