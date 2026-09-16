import assert from "node:assert/strict"
import test from "node:test"
import { getMeetingPlaceNotice } from "./meeting-guidance.ts"
import { buildTourFeedResponse, buildLlmsTxt, buildLlmsFullTxt } from "./ai-feed.ts"

test("海・夜・セットそれぞれの集合場所案内が予約前の確定仕様に一致する", () => {
  for (const id of ["S1", "S2", "S4", "S6", "S7", "S8", "C3", "C4"]) {
    assert.match(getMeetingPlaceNotice(id), /海系ツアー.*前日.*LINE/)
    assert.doesNotMatch(getMeetingPlaceNotice(id), /ナイトツアー/)
  }
  for (const id of ["S3", "S5"]) {
    assert.match(getMeetingPlaceNotice(id), /ナイトツアー.*当日.*LINE/)
    assert.doesNotMatch(getMeetingPlaceNotice(id), /前日/)
  }
  for (const id of ["C1", "C2", "C5", "C6"]) {
    assert.match(getMeetingPlaceNotice(id), /海系ツアー.*前日.*ナイトツアー.*当日.*LINE/)
  }
})

test("公開APIは候補配列がなくても集合場所をページ確定済みと案内しない", () => {
  const { tours, notes } = buildTourFeedResponse()
  assert.ok(tours.some(tour => tour.location.candidates.length === 0))
  for (const tour of tours) {
    assert.equal(tour.location.confirmedBy, "before_tour_line", tour.id)
    assert.equal(tour.location.confirmationNotice, getMeetingPlaceNotice(tour.id), tour.id)
  }
  assert.ok(notes.some(note => /海系ツアー.*前日.*ナイトツアー.*当日/.test(note)))
  for (const output of [buildLlmsTxt(), buildLlmsFullTxt()]) {
    assert.doesNotMatch(output, /3歳未満/)
    assert.match(output, /3歳以下.*無料/)
  }
})
