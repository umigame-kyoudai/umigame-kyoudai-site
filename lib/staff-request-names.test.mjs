import assert from 'node:assert/strict'
import test from 'node:test'
import { EN_DICT } from './i18n/en.ts'
import { KO_DICT } from './i18n/ko.ts'
import { ZH_TW_DICT } from './i18n/zh-tw.ts'

// 外国語の予約フォームで指名ボタンに出す名前。どの言語でも全スタッフ分そろっていること。
test('every booking language has a name for every requestable staff member', () => {
  const ids = ['staff1', 'staff2', 'staff3', 'staff4', 'staff5', 'staff6']
  for (const [locale, dict] of [['en', EN_DICT], ['ko', KO_DICT], ['zh-tw', ZH_TW_DICT]]) {
    for (const id of ids) {
      assert.ok(typeof dict.form.staffNames[id] === 'string' && dict.form.staffNames[id].length > 0, `${locale} ${id}`)
    }
  }
})
