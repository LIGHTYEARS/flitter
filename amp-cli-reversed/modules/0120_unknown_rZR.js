function rZR(T, R) {
  switch (R.tag) {
    case "PatchStateRequest":
      {
        dR(T, 0), FQR(T, R.val);
        break;
      }
    case "StateRequest":
      {
        dR(T, 1), XQR(T, R.val);
        break;
      }
    case "ConnectionsRequest":
      {
        dR(T, 2), QQR(T, R.val);
        break;
      }
    case "ActionRequest":
      {
        dR(T, 3), KQR(T, R.val);
        break;
      }
    case "EventsRequest":
      {
        dR(T, 4), JQR(T, R.val);
        break;
      }
    case "ClearEventsRequest":
      {
        dR(T, 5), RZR(T, R.val);
        break;
      }
    case "RpcsListRequest":
      {
        dR(T, 6), eZR(T, R.val);
        break;
      }
  }
}