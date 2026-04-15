function Kk(T, R) {
  if (R === "admin") throw Error("Cannot set admin settings in file storage");
  if (R === "global") return;
  if (QdT[`amp.${T}`]?.scope === "application") throw Error(`Unable to write ${String(T)} to Workspace Settings. This setting can be written only into User settings.`);
}