const SHEET_NAME = "Data";
const SHARED_SECRET = "ここを長めの共有パスワードに変更";

function doGet(event) {
  return handleRequest({
    action: event.parameter.action || "load",
    secret: event.parameter.secret || "",
  });
}

function doPost(event) {
  const body = JSON.parse(event.postData.contents || "{}");
  return handleRequest(body);
}

function handleRequest(request) {
  try {
    if (request.secret !== SHARED_SECRET) {
      throw new Error("共有パスワードが違います。");
    }

    if (request.action === "load") {
      return jsonResponse({
        ok: true,
        data: readData(),
      });
    }

    if (request.action === "save") {
      validateData(request.data);
      writeData(request.data);
      return jsonResponse({
        ok: true,
        savedAt: new Date().toISOString(),
      });
    }

    throw new Error("未対応の操作です。");
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error.message || "処理に失敗しました。",
    });
  }
}

function validateData(data) {
  if (!data || !data.store || !Array.isArray(data.store.items)) {
    throw new Error("保存データの形式が正しくありません。");
  }
}

function readData() {
  const sheet = getDataSheet();
  const rawValue = sheet.getRange("B1").getValue();

  if (!rawValue) {
    return {
      version: 1,
      savedAt: "",
      store: {
        currentItemId: "",
        items: [],
      },
    };
  }

  return JSON.parse(rawValue);
}

function writeData(data) {
  const sheet = getDataSheet();
  const savedAt = new Date().toISOString();
  const nextData = {
    version: 1,
    savedAt,
    store: data.store,
  };

  sheet.getRange("A1").setValue("payload");
  sheet.getRange("B1").setValue(JSON.stringify(nextData));
  sheet.getRange("A2").setValue("updatedAt");
  sheet.getRange("B2").setValue(savedAt);
}

function getDataSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.getRange("A1").setValue("payload");
    sheet.getRange("A2").setValue("updatedAt");
  }

  return sheet;
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
