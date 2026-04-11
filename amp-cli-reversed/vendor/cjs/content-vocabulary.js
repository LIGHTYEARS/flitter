// Module: content-vocabulary
// Original: EMT
// Type: CJS (RT wrapper)
// Exports: contentVocabulary, metadataVocabulary
// Category: util

// Module: EMT (CJS)
(T) => {
  (Object.defineProperty(T, "__esModule", { value: !0 }),
    (T.contentVocabulary = T.metadataVocabulary = void 0),
    (T.metadataVocabulary = [
      "title",
      "description",
      "default",
      "deprecated",
      "readOnly",
      "writeOnly",
      "examples",
    ]),
    (T.contentVocabulary = [
      "contentMediaType",
      "contentEncoding",
      "contentSchema",
    ]));
};
