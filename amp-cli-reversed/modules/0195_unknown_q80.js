function q80(T, R) {
  switch (R.tag) {
    case "ActionRequest":
      {
        dR(T, 0), N80(T, R.val);
        break;
      }
    case "SubscriptionRequest":
      {
        dR(T, 1), H80(T, R.val);
        break;
      }
  }
}