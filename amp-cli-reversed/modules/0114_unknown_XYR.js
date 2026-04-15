function XYR(T, R) {
  switch (R.tag) {
    case "PatchStateRequest":
      {
        dR(T, 0), gYR(T, R.val);
        break;
      }
    case "StateRequest":
      {
        dR(T, 1), SYR(T, R.val);
        break;
      }
    case "ConnectionsRequest":
      {
        dR(T, 2), dYR(T, R.val);
        break;
      }
    case "ActionRequest":
      {
        dR(T, 3), vYR(T, R.val);
        break;
      }
    case "RpcsListRequest":
      {
        dR(T, 4), CYR(T, R.val);
        break;
      }
    case "TraceQueryRequest":
      {
        dR(T, 5), MYR(T, R.val);
        break;
      }
    case "QueueRequest":
      {
        dR(T, 6), wYR(T, R.val);
        break;
      }
    case "WorkflowHistoryRequest":
      {
        dR(T, 7), NYR(T, R.val);
        break;
      }
    case "WorkflowReplayRequest":
      {
        dR(T, 8), qYR(T, R.val);
        break;
      }
    case "DatabaseSchemaRequest":
      {
        dR(T, 9), FYR(T, R.val);
        break;
      }
    case "DatabaseTableRowsRequest":
      {
        dR(T, 10), KYR(T, R.val);
        break;
      }
  }
}