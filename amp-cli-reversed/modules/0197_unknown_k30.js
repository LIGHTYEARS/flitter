function k30(T, R) {
  switch (R.tag) {
    case "Init":
      {
        dR(T, 0), n30(T, R.val);
        break;
      }
    case "Error":
      {
        dR(T, 1), _30(T, R.val);
        break;
      }
    case "ActionResponse":
      {
        dR(T, 2), m30(T, R.val);
        break;
      }
    case "Event":
      {
        dR(T, 3), y30(T, R.val);
        break;
      }
  }
}