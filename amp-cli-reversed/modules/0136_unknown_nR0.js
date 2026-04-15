function nR0(T, R) {
  switch (R.tag) {
    case "StateResponse":
      {
        dR(T, 0), LT0(T, R.val);
        break;
      }
    case "ConnectionsResponse":
      {
        dR(T, 1), ET0(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 2), DT0(T, R.val);
        break;
      }
    case "ConnectionsUpdated":
      {
        dR(T, 3), iR0(T, R.val);
        break;
      }
    case "QueueUpdated":
      {
        dR(T, 4), RR0(T, R.val);
        break;
      }
    case "StateUpdated":
      {
        dR(T, 5), JT0(T, R.val);
        break;
      }
    case "WorkflowHistoryUpdated":
      {
        dR(T, 6), eR0(T, R.val);
        break;
      }
    case "RpcsListResponse":
      {
        dR(T, 7), rR0(T, R.val);
        break;
      }
    case "TraceQueryResponse":
      {
        dR(T, 8), BT0(T, R.val);
        break;
      }
    case "QueueResponse":
      {
        dR(T, 9), FT0(T, R.val);
        break;
      }
    case "WorkflowHistoryResponse":
      {
        dR(T, 10), KT0(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 11), sR0(T, R.val);
        break;
      }
    case "Init":
      {
        dR(T, 12), OT0(T, R.val);
        break;
      }
    case "DatabaseSchemaResponse":
      {
        dR(T, 13), XT0(T, R.val);
        break;
      }
    case "DatabaseTableRowsResponse":
      {
        dR(T, 14), QT0(T, R.val);
        break;
      }
  }
}