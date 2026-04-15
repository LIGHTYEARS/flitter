function uwR(T) {
  if (!T || !X9(T)) return [];
  let {
    user: R
  } = T;
  return [{
    type: "text",
    text: ["# Signed-In User", ...(R.username ? [`- Amp username: ${R.username}`] : []), ...(R.githubLogin ? [`- Connected GitHub login: @${R.githubLogin}`] : ["- No stored GitHub identity is currently known."]), ...(R.slackUserID ? [`- Connected Slack user ID: ${R.slackUserID}`] : ["- No stored Slack identity is currently known."])].join(`
`)
  }];
}