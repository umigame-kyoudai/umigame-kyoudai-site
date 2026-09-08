import assert from 'node:assert/strict'

// In-memory Sheets API boundary: appendCells chooses its row at commit time,
// independently of both Apps Script runtimes and their separate ScriptLocks.
export function attachSheetsApi(runtime, sheet, hooks = {}) {
  sheet.getName ??= () => '予約一覧'
  sheet.getSheetId ??= () => 123
  sheet.getParent ??= () => ({ getId: () => 'test-sheet', getSpreadsheetTimeZone: () => 'UTC' })
  sheet.getLastRow ??= () => {
    const values = sheet.getRange(1, 1, sheet.getMaxRows(), 49).getValues()
    return values.findLastIndex(row => row.some(value => value !== '' && value != null)) + 1
  }
  runtime.Sheets = { Spreadsheets: {
    get() {
      const values = Array.from({ length: 21 }, (_, i) => ({
        ...(sheet.validations?.[1]?.[i] ? { dataValidation: sheet.validations[1][i] } : {}),
      }))
      return { sheets: [{ data: [{ rowData: [{ values }] }] }] }
    },
    batchUpdate(body, spreadsheetId) {
      assert.equal(spreadsheetId, sheet.getParent().getId())
      assert.equal(body.requests.length, 1)
      const append = body.requests[0].appendCells
      assert.equal(append.sheetId, sheet.getSheetId())
      hooks.beforeAppend?.()
      const start = sheet.getLastRow() + 1
      const end = start + append.rows.length - 1
      if (end > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), end - sheet.getMaxRows())
      const rows = append.rows.map((row, offset) => row.values.map((cell, column) => {
        if (append.fields.includes('dataValidation') && sheet.validations) {
          sheet.validations[start + offset - 1][column] = cell.dataValidation || false
        }
        const value = cell.userEnteredValue || {}
        if (cell.userEnteredFormat?.numberFormat?.type === 'DATE_TIME') {
          return new Date(Math.round((value.numberValue - 25569) * 86400000))
        }
        return value.stringValue ?? value.numberValue ?? value.boolValue ?? ''
      }))
      sheet.getRange(start, 1, rows.length, rows[0].length).setValues(rows)
      hooks.afterAppend?.()
      return { replies: [{}] }
    },
  } }
}
