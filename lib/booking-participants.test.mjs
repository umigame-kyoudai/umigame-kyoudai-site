import assert from 'node:assert/strict'
import test from 'node:test'
import { syncRepresentativeName } from './booking-participants.ts'

test('代表者名を1人目へ反映し、年齢・器材と同伴者の入力は保持する', () => {
  const first = { id: 'adult-1', category: 'adult', name: '', age: 35, footSize: 25.5, wetsuitRental: true }
  const companion = { id: 'adult-2', category: 'adult', name: '同行者', age: 32 }
  const child = { id: 'child-1', category: 'child', name: 'お子様', age: 8 }
  const original = [first, companion, child]
  const result = syncRepresentativeName(original, '  代表 太郎  ')
  assert.deepEqual(result[0], { ...first, name: '  代表 太郎  ' })
  assert.equal(result[1], companion)
  assert.equal(result[2], child)
  assert.equal(first.name, '')
  assert.notEqual(result, original)
})

test('名前の訂正・クリアも反映し、同じ名前なら配列を作り直さない', () => {
  const original = [{ id: 'adult-1', category: 'adult', name: '訂正前', age: 28 }]
  const corrected = syncRepresentativeName(original, '訂正後')
  assert.equal(corrected[0].name, '訂正後')
  assert.equal(syncRepresentativeName(corrected, '訂正後'), corrected)
  assert.equal(syncRepresentativeName(corrected, '姓 ')[0].name, '姓 ')
  assert.equal(syncRepresentativeName(corrected, '')[0].name, '')
})

test('人数入力前・子どもだけの入力途中には代表者名を付けない', () => {
  const empty = []
  const childOnly = [{ id: 'child-1', category: 'child', name: 'お子様', age: 8 }]
  assert.equal(syncRepresentativeName(empty, '代表 太郎'), empty)
  assert.equal(syncRepresentativeName(childOnly, '代表 太郎'), childOnly)
  const withAdult = [{ id: 'adult-1', category: 'adult', name: '', age: '' }, ...childOnly]
  const result = syncRepresentativeName(withAdult, '代表 太郎')
  assert.equal(result[0].name, '代表 太郎')
  assert.equal(result[1], childOnly[0])
})

test('旧下書きと人数の再追加でも1人目の名前を揃える', () => {
  const restored = [{ id: 'saved-adult', category: 'adult', name: '以前の入力', age: 40, height: 170, weight: 65 }]
  assert.deepEqual(syncRepresentativeName(restored, '代表者')[0], { ...restored[0], name: '代表者' })
  const addedAgain = [{ id: 'new-adult', category: 'adult', name: '', age: '' }]
  assert.equal(syncRepresentativeName(addedAgain, '代表者')[0].name, '代表者')
})
