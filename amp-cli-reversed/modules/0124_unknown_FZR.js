function FZR(T, R) {
  switch (R.tag) {
    case "StateResponse":
      {
        dR(T, 0), SZR(T, R.val);
        break;
      }
    case "ConnectionsResponse":
      {
        dR(T, 1), vZR(T, R.val);
        break;
      }
    case "EventsResponse":
      {
        dR(T, 2), dZR(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 3), CZR(T, R.val);
        break;
      }
    case "ConnectionsUpdated":
      {
        dR(T, 4), HZR(T, R.val);
        break;
      }
    case "EventsUpdated":
      {
        dR(T, 5), wZR(T, R.val);
        break;
      }
    case "StateUpdated":
      {
        dR(T, 6), MZR(T, R.val);
        break;
      }
    case "RpcsListResponse":
      {
        dR(T, 7), NZR(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 8), qZR(T, R.val);
        break;
      }
    case "Init":
      {
        dR(T, 9), gZR(T, R.val);
        break;
      }
  }
}