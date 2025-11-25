function doGet(e) {
  clearUsersCache(); //очищає  кеш
  return HtmlService.createHtmlOutputFromFile("ui") // ім'я твого HTML-файлу в проекті
    .setTitle("Облік робочого часу")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
// Визначення ід цільових таблиць
let dbId = "1zu5G4q3mlS46FHPQuS0SlNmTwO0G41iuphaEB4ZLK9A"; // Довідник працівників
let wlId = "1MNMuwMZ6bccCboJRagpV01D-M3_LPGGcgKYjNDwDRv8"; // Журнал обліку

let sheetNamedbId = "Аркуш1"; //
let sheetNamewlId = "Аркуш1"; //
let usersData = getUsersCached(); // кеш з довідника працівників
let journalSheet = getJournal(); //Таблиця Журнал обліку
let timeLimit = 17; // часовий ліміт зміни

// Онлайн Кеш з Довідника працівників
// ====================================================
function getUsersCached() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("UsersDB");
  if (cached) {
    Logger.log("Отримано з кешу");
    // Logger.log(cached)
    return JSON.parse(cached);
  }

  // Якщо в кеші нема — читаємо з таблиці
  const data = SpreadsheetApp.openById(dbId)
    .getSheetByName(sheetNamedbId)
    .getDataRange()
    .getValues();

  // Конвертуємо масив у об’єкт із UID як ключем
  const dataObj = {};

  //
  for (let i = 1; i < data.length; i++) {
    const [uid, name, prewStatus, timestamp, entryIndex] = data[i];
    if (uid) {
      dataObj[uid] = { name, prewStatus, timestamp, entryIndex };
    }
  }

  // Зберігаємо в кеш на 6 годин (макс. 21600 секунд)
  cache.put("UsersDB", JSON.stringify(dataObj), 21600);

  Logger.log("Отримано з таблиці і кешовано");
  return dataObj;
}
//Очистити  Кеш з Довідника працівників
function clearUsersCache() {
  const cache = CacheService.getScriptCache();
  cache.remove("UsersDB");
  Logger.log("Кеш користувачів очищено");
}

// Оновити інформацію про працівника у кеші
function updateUserInCache(uid, patch) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get("UsersDB");

  let users = {};
  if (cached) users = JSON.parse(cached);

  const current = users[uid];
  users[uid] = { ...current, ...patch };

  cache.put("UsersDB", JSON.stringify(users), 21600); // 6 год
  Logger.log(`🔄 Оновлено кеш користувача ${uid}`);
}

function checkUserId(uid = "g", retry = false) {
  // Отримуємо актуальні дані (можливо з кешу)
  usersData = getUsersCached();

  const user = usersData[uid];
  if (user) {
    Logger.log(`✅ Знайдено користувача: ${JSON.stringify(user.name)}`);
    return JSON.stringify(user);
  }

  // Якщо користувача не знайшли і ще не пробували оновити кеш
  if (!retry) {
    Logger.log(`⚠️ Не знайдено ${uid} у кеші. Оновлюю кеш і повторюю...`);
    clearUsersCache();
    return checkUserId(uid, true); // рекурсія з прапорцем retry = true
  }

  // Якщо навіть після оновлення кешу не знайдено
  throw new Error(`❌ Користувача ${uid} не зареєстровано в системі`);
}

// [0]  [1]   [2]       [3]           [4]
// [id]	[імя]	[Статус]	[Мітка часу]	[номер останнього запису в журналі]
function updateUserInUsersDB(uid, patch) {
  const db = SpreadsheetApp.openById(dbId);
  const values = db.getSheetByName(sheetNamedbId).getDataRange().getValues();
  // Logger.log(values);

  const index = values.findIndex((row) => row[0] === uid);
  const range = db.getSheetByName(sheetNamedbId).getRange(index + 1, 3, 1, 3); // [Статус]	[Мітка часу]	[номер ост запису в журналі]
  const updateRow = [[patch.prewStatus, patch.timestamp, patch.entryIndex]];
  range.setValues(updateRow);
}

// Повертає аркуш 1 таблиці
function getJournal() {
  try {
    let ss = SpreadsheetApp.openById(wlId).getSheetByName(sheetNamewlId);
    if (!ss) {
      throw new Error(`Аркуш ${sheetNamewlId} не знайдено`);
    } else {
      return ss;
    }
  } catch (err) {
    Logger.log(`getJournal() filed: ${err.name} : ${err.message}`);
    return null;
  }
}
// 1 визначити індекс запису в журналі
function findJournalEntryIndex(
  uid = "id124",
  journalValues = journalSheet.getDataRange().getValues()
) {
  let index;
  for (let i = journalValues.length - 1; i >= 0; i--) {
    if (journalValues[i][0].includes(uid)) {
      // Logger.log(journalValues[i][0].includes(uid))
      index = i;
    }
  }
  // Logger.log(index)
  if (index) {
    return index;
  } else {
    throw new Error("findJournalEntryIndex() : not found");
  }
}
//! крива ця функція
function updateStatus() {
  let journalValues = journalSheet.getDataRange().getValues();
  now = new Date();
  let activeVal = journalValues.filter((i) => i[5] === status.start);
  let pendingVal = activeVal.filter(
    (i) => now - new Date(i[2]) > 17 * 60 * 60 * 1000
  ); // фільтр змін, що тривають більше 17 год
  Logger.log(pendingVal);

  for (let i = 0; i < pendingVal.length; i++) {
    // оновити висячі записи статусом
    // findJournalEntryIndex(uid, масив)
    let index = findJournalEntryIndex(pendingVal[i][0], journalValues);
    // оновлений масив
    // pendingVal[i][6]=status.pending
    let statusCell = journalSheet.getRange(index + 1, 6, 1, 1);
    Logger.log(statusCell);

    statusCell.setValue(status.pending);
    updateUserInUsersDB(pendingVal[i][0], { prewStatus: status.pending });
    updateUserInCache(pendingVal[i][0], { prewStatus: status.pending });
    Logger.log("Func : updateStatus () status was updated");
  }
  clearUsersCache();

  Logger.log(pendingVal);
}

// function checkStatus(uid){
//   let journalValues = journalSheet.getDataRange().getValues()
//   try {
//     let i = findJournalEntryIndex(uid, journalValues ) // має знаходити індекс будьякого запису

//     let status = [journalValues[i][1], journalValues[i][5]];
//     Logger.log(`user name : ${status[0]} status  : ${status[1]}`)
//     return status
//   } catch (err) {
//     Logger.log(err.message);
//     return err.message;
//   }

// }

/*
НОВА ЛОГІКА:
Запис в журналі містить такі дані (наведено 3 варіанти залежно від статусу) приклад  кінцевого результату
[0,       1,      2,             3,                4,                   5,          ]
["Uid",   "імя",  "час початку", "час завершення", "відпрацьовано год", "статус"    ]
=======================================================================================================================
["Uid1",  "uname","23:00:00",    "---",            "---",               "Працює"    ]
["Uid1",  "uname","23:00:00",    "---",            "---",               "Незакрита" ]
["Uid1",  "uname","23:00:00",    "06:00:00",       "7",                 "Завершив"  ]
["Uid1",  "uname","23:00:00",    "16:00:00",       "---",               "Наднорма"  ]


Якщо валідний id :
1. Якщо журнал порожній => (додати шапку)
Якщо в журналі немає жодного запису за цим id => (Перша реєестрація? => (Почати зміну!))
Якщо в журналі є запис за цим id , що містить час початку та має порожній час заверження => (Закінчити зміну!)
Якщо в журналі є запис за цим id , що містить час початку та має час завершення => (Почати зміну!)



Якщо більше 17 год то повідомити що потребує уточнення і не писати відпрацьований час

ЗАКІНЧИТИ ЗМІНУ( Оновити запис - додати дані про закінчення зміни та результати обчислень відпрацьованого часу)

ПОЧАТИ ЗМІНУ( Додати новий запис - Створити новий рядок, що містить дані про відкриту (ще не завершену) зміну)
*/
//1. превірка чи ініційовано журнал (додавання шапки)

const status = {
  start: "Працює",
  end: "Завершено",
  overtime: "Наднорма",
  pending: "Не закрита",
};
const actionType = {
  start: "Початок зміни",
  end: "Кінець зміни",
};

// ======== Почати зміну ===========
function addNewEntry(uid) {
  const time = new Date();
  const user = usersData[uid];
  // Logger.log(user);

  journalSheet.appendRow([uid, user.name, time, "---", "---", status.start]);

  // отримати номер запису
  const newRowIndex = journalSheet.getLastRow();

  //Оновити статус в Довіднику і в кеші
  const patch = {
    prewStatus: status.start,
    timestamp: time,
    entryIndex: newRowIndex,
  };
  updateUserInCache(uid, patch);
  updateUserInUsersDB(uid, patch);

  // Форматування (виділення зеленим кольором)
  // const sheet=journalSheet;
  // const row = sheet.getRange(sheet.getLastRow(), 1, 1, sheet.getLastColumn());
  // row.setBackground("green").setFontColor("#f4f4f4");
}

//=============Закрити зміну=============

function closeShift(entryIndex, uid, prewStatus) {
  const endTime = new Date();
  entryIndex = Math.floor(entryIndex);
  let journalValues = journalSheet.getDataRange().getValues();

  // 2 Оновити запис , додати статус, визначити вілпрацьований час
  // обчислити проміжні значення
  let totalTime;

  function updateJournalEntry(entryIndex, arr2d) {
    arr2d[0][1] = (endTime - journalValues[entryIndex - 1][2]) / 86400000;
    if (arr2d[0][1] > 17 / 24) {
      arr2d[0][2] = status.overtime;
    }
    //Форматування
    let range = journalSheet.getRange(entryIndex, 4, 1, 3);
    range.setNumberFormats([["dd.mm  hh:mm:ss", "[h]:mm:ss", "@"]]);

    // let row = journalSheet.getRange(journalEntryIndex + 1, 1, 1,journalSheet.getLastColumn() );
    // row.setBackground("#343434").setFontColor("#f4f4f4");
    range.setValues(arr2d);
    // Logger.log("Func : updateJournalEntry () data was updated");

    // patch.prewStatus, patch.timestamp, patch.entryIndex
    const patch = {
      prewStatus: arr2d[0][2],
      timestamp: endTime,
      entryIndex: entryIndex,
    };
    updateUserInCache(uid, patch);
    updateUserInUsersDB(uid, patch);
  }

  let arrVal = [[endTime, totalTime, status.end]];

  updateJournalEntry(entryIndex, arrVal);

  // Logger.log(arrVal);
}

//===============COMPAREDATA ()==========================
//
function compareData(employeId = "jk", shiftType = actionType.start) {
  const currentTimeStamp = new Date();

  try {
    // Перевірити ід  та отримати дані працівника {uid, name, prewStatus, timestamp, entryIndex} !!!
    const userData = JSON.parse(checkUserId(employeId));

    // // Перевірити статус працівника
    // if (!userData) {
    //   throw new Error(
    //     "Працівника не знайдено у довіднику (або ще не зарєєстровано)"
    //   );
    // }

    const { name, prewStatus, entryIndex } = userData;

    // Якщо статус останнього запису (Завершено/ Не закрито/ Наднорма/ Порожній рядок ) і тип зміни, що вибрав працівник (Початок зміни) то додати новий запис
    if (
      shiftType === actionType.start //"Початок зміни"
    ) {
      addNewEntry(employeId, currentTimeStamp);
      return { isValid: true, message: `Продуктивної зміни, ${name} !` };
    } else if (
      shiftType === actionType.end //"Кінець зміни"
    ) {
      // Якщо статус останнього запису (Працює/Не закрито)  і тип зміни, що вибрав працівник (Кінець зміни) то Закрити зміну
      closeShift(entryIndex, employeId, currentTimeStamp, prewStatus);
      return { message: `Приємного відпочинку, ${name} !` };
      // Якщо працівник хоче закрити  вже закриту або розпочати вже активну зміну
    } else {
      throw new Error("CompareData():unknow Err");
    }
  } catch (err) {
    Logger.log(`Помилка у compareData(): ${err.message}`);
    return { message: err.message };
  }
}
// Нова основна логіка
// з фронта приходить uid
// response повертає інформацію про працівника та дозволену дію або помилку та недозволені дії

function request(employeId = "59485") {
  const res = { action: false };
  try {
    // Перевірити ід та отримати дані працівника   {uid, name, prewStatus, timestamp, entryIndex} !!!
    const userData = JSON.parse(checkUserId(employeId));
    const { name, prewStatus, entryIndex } = userData;
    Logger.log(userData);
    Logger.log(name);
    Logger.log(entryIndex); //? чи викличе пусте значення в фронті чи вже на бекенді  помилку
    if (
      prewStatus === status.end ||
      prewStatus === status.pending ||
      prewStatus === status.overtime ||
      prewStatus === ""
    ) {
      //"Початок зміни"
      res.action = "addNewEntry";
      Logger.log(res);
    } else if (prewStatus === status.start || prewStatus === status.pending) {
      //"Кінець зміни" // Якщо статус останнього запису (Працює/Не закрито) і тип зміни, що вибрав працівник (Кінець зміни) то Закрити зміну
      res.action = "closeShift";
      Logger.log(res);
    }
    return { ...res, name, entryIndex };
  } catch (err) {
    Logger.log(`Помилка у request(): ${err.message}`);
    Logger.log(res);
    return { ...res, message: err.message };
  } // google.script.run[res.action](id, entryIndex) }
}
