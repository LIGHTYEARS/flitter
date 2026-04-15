function mjR(T) {
  let R = {},
    a = H(T, ["setupComplete"]);
  if (a != null) Y(R, ["setupComplete"], a);
  let e = H(T, ["serverContent"]);
  if (e != null) Y(R, ["serverContent"], e);
  let t = H(T, ["toolCall"]);
  if (t != null) Y(R, ["toolCall"], t);
  let r = H(T, ["toolCallCancellation"]);
  if (r != null) Y(R, ["toolCallCancellation"], r);
  let h = H(T, ["usageMetadata"]);
  if (h != null) Y(R, ["usageMetadata"], xjR(h));
  let i = H(T, ["goAway"]);
  if (i != null) Y(R, ["goAway"], i);
  let c = H(T, ["sessionResumptionUpdate"]);
  if (c != null) Y(R, ["sessionResumptionUpdate"], c);
  let s = H(T, ["voiceActivityDetectionSignal"]);
  if (s != null) Y(R, ["voiceActivityDetectionSignal"], s);
  let A = H(T, ["voiceActivity"]);
  if (A != null) Y(R, ["voiceActivity"], fjR(A));
  return R;
}