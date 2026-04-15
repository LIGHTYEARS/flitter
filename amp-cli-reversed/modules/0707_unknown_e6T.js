function e6T(T) {
  let R = T;
  if (R === "BATCH_STATE_UNSPECIFIED") return "JOB_STATE_UNSPECIFIED";else if (R === "BATCH_STATE_PENDING") return "JOB_STATE_PENDING";else if (R === "BATCH_STATE_RUNNING") return "JOB_STATE_RUNNING";else if (R === "BATCH_STATE_SUCCEEDED") return "JOB_STATE_SUCCEEDED";else if (R === "BATCH_STATE_FAILED") return "JOB_STATE_FAILED";else if (R === "BATCH_STATE_CANCELLED") return "JOB_STATE_CANCELLED";else if (R === "BATCH_STATE_EXPIRED") return "JOB_STATE_EXPIRED";else return R;
}