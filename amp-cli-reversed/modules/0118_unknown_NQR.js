function NQR(T, R) {
  switch (R.tag) {
    case "StateResponse":
      {
        dR(T, 0), hQR(T, R.val);
        break;
      }
    case "ConnectionsResponse":
      {
        dR(T, 1), tQR(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 2), cQR(T, R.val);
        break;
      }
    case "ConnectionsUpdated":
      {
        dR(T, 3), MQR(T, R.val);
        break;
      }
    case "QueueUpdated":
      {
        dR(T, 4), SQR(T, R.val);
        break;
      }
    case "StateUpdated":
      {
        dR(T, 5), vQR(T, R.val);
        break;
      }
    case "WorkflowHistoryUpdated":
      {
        dR(T, 6), dQR(T, R.val);
        break;
      }
    case "RpcsListResponse":
      {
        dR(T, 7), CQR(T, R.val);
        break;
      }
    case "TraceQueryResponse":
      {
        dR(T, 8), oQR(T, R.val);
        break;
      }
    case "QueueResponse":
      {
        dR(T, 9), mQR(T, R.val);
        break;
      }
    case "WorkflowHistoryResponse":
      {
        dR(T, 10), yQR(T, R.val);
        break;
      }
    case "WorkflowReplayResponse":
      {
        dR(T, 11), kQR(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 12), wQR(T, R.val);
        break;
      }
    case "Init":
      {
        dR(T, 13), aQR(T, R.val);
        break;
      }
    case "DatabaseSchemaResponse":
      {
        dR(T, 14), fQR(T, R.val);
        break;
      }
    case "DatabaseTableRowsResponse":
      {
        dR(T, 15), gQR(T, R.val);
        break;
      }
  }
}