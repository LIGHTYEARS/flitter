function JrT(T) {
  let R = new URL(`https://dash.cloudflare.com/${DRR}/workers/services/view/${EU0}/production/observability/events`);
  return R.searchParams.set("filterCombination", '"and"'), R.searchParams.set("calculations", '[{"operator":"count"}]'), R.searchParams.set("orderBy", '{"value":"count","limit":10,"order":"desc"}'), R.searchParams.set("timeframe", "24h"), R.searchParams.set("conditions", "{}"), R.searchParams.set("conditionCombination", '"and"'), R.searchParams.set("alertTiming", '{"interval":300,"window":900,"timeBeforeFiring":600,"timeBeforeResolved":600}'), R.searchParams.set("filters", JSON.stringify([{
    key: "threadId",
    operation: "eq",
    value: T,
    type: "string"
  }])), R.toString();
}