// const PROPS = PropertiesService.getScriptProperties(); // це об'єкт , яки варто щоразу оновлювати , чи це шлях до об'єкта
function showSettings() {
  const tmpl = HtmlService.createTemplateFromFile("settings");
  tmpl.dburl = getDBurl();
  tmpl.wlurl = getWlurl();
  return tmpl.evaluate().getContent();
}

// getter & setter DB
function getDBid() {
  const val = PROPS.getProperty("dbid");
  return val ? JSON.parse(val) : null;
}
function getDBurl() {
  const val = PROPS.getProperty("dburl");
  return val ? JSON.parse(val) : null;
}
function setDBid(data) {
  PROPS.setProperty("dbid", JSON.stringify(data));
}
function setDBurl(data) {
  PROPS.setProperty("dburl", JSON.stringify(data));
}
// getter & setter Wl
function getWlid() {
  const val = PROPS.getProperty("wlid");
  return val ? JSON.parse(val) : null;
}
function getWlurl() {
  const val = PROPS.getProperty("wlurl");
  return val ? JSON.parse(val) : null;
}
function setWlid(data) {
  PROPS.setProperty("wlid", JSON.stringify(data));
}
function setWlurl(data) {
  PROPS.setProperty("wlurl", JSON.stringify(data));
}
// записати в пропс
function setDataProps(dburl, wlurl) {
  setDBurl(dburl);
  setWlurl(wlurl);

  const dbid = extractSheetId(dburl);
  const wlid = extractSheetId(wlurl);

  if (!dbid || !wlid) {
    throw new Error("Не вдалося витягнути ID з одного з URL.");
  }

  setDBid(dbid);
  setWlid(wlid);

  return {
    status: "ok",
    dbid,
    wlid,
  };
}
//Парсити ід
function extractSheetId(url) {
  if (!url) return null;

  // Стандартні URL:
  // https://docs.google.com/spreadsheets/d/ID/edit
  // https://docs.google.com/spreadsheets/d/ID/
  // ...та інші варіанти
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);

  return match ? match[1] : null;
}
