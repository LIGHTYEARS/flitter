function AJR(T, R) {
  switch (R.tag) {
    case "PatchStateRequest":
      {
        dR(T, 0), QZR(T, R.val);
        break;
      }
    case "StateRequest":
      {
        dR(T, 1), RJR(T, R.val);
        break;
      }
    case "ConnectionsRequest":
      {
        dR(T, 2), eJR(T, R.val);
        break;
      }
    case "ActionRequest":
      {
        dR(T, 3), JZR(T, R.val);
        break;
      }
    case "RpcsListRequest":
      {
        dR(T, 4), rJR(T, R.val);
        break;
      }
    case "TraceQueryRequest":
      {
        dR(T, 5), iJR(T, R.val);
        break;
      }
    case "QueueRequest":
      {
        dR(T, 6), sJR(T, R.val);
        break;
      }
    case "WorkflowHistoryRequest":
      {
        dR(T, 7), nJR(T, R.val);
        break;
      }
  }
}