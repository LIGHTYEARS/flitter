function d30(T, R) {
  switch (R.tag) {
    case "ActionRequest":
      {
        dR(T, 0), v30(T, R.val);
        break;
      }
    case "SubscriptionRequest":
      {
        dR(T, 1), S30(T, R.val);
        break;
      }
  }
}