function k1(T, R) {
  return T === "guard" && (R === "actor_ready_timeout" || R === "actor_runner_failed");
}
async function nS(T, R, a) {
  g0().debug({
    msg: "querying actor",
    query: JSON.stringify(R)
  });
  let e;
  if ("getForId" in R) {
    let t = await a.getForId({
      c: T,
      name: R.getForId.name,
      actorId: R.getForId.actorId
    });
    if (!t) throw new _yT(R.getForId.actorId);
    e = t;
  } else if ("getForKey" in R) {
    let t = await a.getWithKey({
      c: T,
      name: R.getForKey.name,
      key: R.getForKey.key
    });
    if (!t) throw new _yT(`${R.getForKey.name}:${JSON.stringify(R.getForKey.key)}`);
    e = t;
  } else if ("getOrCreateForKey" in R) e = {
    actorId: (await a.getOrCreateWithKey({
      c: T,
      name: R.getOrCreateForKey.name,
      key: R.getOrCreateForKey.key,
      input: R.getOrCreateForKey.input,
      region: R.getOrCreateForKey.region
    })).actorId
  };else if ("create" in R) e = {
    actorId: (await a.createActor({
      c: T,
      name: R.create.name,
      key: R.create.key,
      input: R.create.input,
      region: R.create.region
    })).actorId
  };else throw new mFT("Invalid query format");
  return g0().debug({
    msg: "actor query result",
    actorId: e.actorId
  }), {
    actorId: e.actorId
  };
}