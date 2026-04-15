function Tl0(T) {
  switch (T.type) {
    case "compaction_started":
      return {
        type: "compaction_started",
        message: T
      };
    case "compaction_complete":
      return {
        type: "compaction_complete",
        message: T
      };
  }
}