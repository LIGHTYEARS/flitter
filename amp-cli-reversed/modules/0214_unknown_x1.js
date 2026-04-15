function x1(T) {
  if ("getForId" in T) return T.getForId.name;
  if ("getForKey" in T) return T.getForKey.name;
  if ("getOrCreateForKey" in T) return T.getOrCreateForKey.name;
  if ("create" in T) return T.create.name;
  throw new mFT("Invalid query format");
}