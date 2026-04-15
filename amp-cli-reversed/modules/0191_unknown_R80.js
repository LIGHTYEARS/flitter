function R80(T, R) {
  switch (R.tag) {
    case "ActionRequest":
      {
        dR(T, 0), Q90(T, R.val);
        break;
      }
    case "SubscriptionRequest":
      {
        dR(T, 1), J90(T, R.val);
        break;
      }
  }
}