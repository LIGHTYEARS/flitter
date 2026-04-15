function fT0(T, R) {
  switch (R.tag) {
    case "PatchStateRequest":
      {
        dR(T, 0), eT0(T, R.val);
        break;
      }
    case "StateRequest":
      {
        dR(T, 1), iT0(T, R.val);
        break;
      }
    case "ConnectionsRequest":
      {
        dR(T, 2), sT0(T, R.val);
        break;
      }
    case "ActionRequest":
      {
        dR(T, 3), rT0(T, R.val);
        break;
      }
    case "RpcsListRequest":
      {
        dR(T, 4), nT0(T, R.val);
        break;
      }
    case "TraceQueryRequest":
      {
        dR(T, 5), AT0(T, R.val);
        break;
      }
    case "QueueRequest":
      {
        dR(T, 6), _T0(T, R.val);
        break;
      }
    case "WorkflowHistoryRequest":
      {
        dR(T, 7), mT0(T, R.val);
        break;
      }
    case "DatabaseSchemaRequest":
      {
        dR(T, 8), yT0(T, R.val);
        break;
      }
    case "DatabaseTableRowsRequest":
      {
        dR(T, 9), kT0(T, R.val);
        break;
      }
  }
}