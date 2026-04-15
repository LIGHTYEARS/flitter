function QJR(T, R) {
  switch (R.tag) {
    case "StateResponse":
      {
        dR(T, 0), IJR(T, R.val);
        break;
      }
    case "ConnectionsResponse":
      {
        dR(T, 1), xJR(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 2), $JR(T, R.val);
        break;
      }
    case "ConnectionsUpdated":
      {
        dR(T, 3), KJR(T, R.val);
        break;
      }
    case "QueueUpdated":
      {
        dR(T, 4), HJR(T, R.val);
        break;
      }
    case "StateUpdated":
      {
        dR(T, 5), NJR(T, R.val);
        break;
      }
    case "WorkflowHistoryUpdated":
      {
        dR(T, 6), qJR(T, R.val);
        break;
      }
    case "RpcsListResponse":
      {
        dR(T, 7), FJR(T, R.val);
        break;
      }
    case "TraceQueryResponse":
      {
        dR(T, 8), jJR(T, R.val);
        break;
      }
    case "QueueResponse":
      {
        dR(T, 9), MJR(T, R.val);
        break;
      }
    case "WorkflowHistoryResponse":
      {
        dR(T, 10), wJR(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 11), XJR(T, R.val);
        break;
      }
    case "Init":
      {
        dR(T, 12), PJR(T, R.val);
        break;
      }
  }
}