import assert from "node:assert/strict"
import test from "node:test"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { getMiyakojimaSunsetGuide } from "./miyakojima-sunset.ts"

test("同じ宮古島の日付なら端末のtimezoneによらず日没・日付・集合時刻が一致する", () => {
  // 月末・年末・閏日と欧米の夏時間切替日を含む。端末ごとに新しいNodeプロセスで実行する。
  const dates = ["2026-09-20", "2026-01-01", "2026-12-31", "2028-02-29", "2026-03-08", "2026-03-29", "2026-11-01"]
  const source = `import { getMiyakojimaSunsetGuide } from './lib/miyakojima-sunset.ts';
    process.stdout.write(JSON.stringify(${JSON.stringify(dates)}.map(getMiyakojimaSunsetGuide)));`
  const results = ["Asia/Tokyo", "America/New_York", "Europe/London", "Pacific/Honolulu"].map((timeZone) => {
    return JSON.parse(execFileSync(process.execPath, [
      "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--import", "./scripts/test-alias-hooks.mjs",
      "--input-type=module", "--eval", source,
    ], {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      env: { ...process.env, TZ: timeZone }, encoding: "utf8",
    }))
  })
  for (const result of results.slice(1)) assert.deepEqual(result, results[0])
  assert.equal(results[0][0].label, "9月20日")
  assert.equal(results[0][1].label, "1月1日")
  assert.equal(results[0][1].meet, "16:45")
  assert.equal(results[0][2].label, "12月31日")
  assert.equal(results[0][2].meet, "16:30")
  for (const guide of results[0]) assert.match(guide.sunset, /^(17|18|19):[0-5]\d$/)
})

test("未入力・不正な日付は日没を計算せず月別の案内へ戻す", () => {
  for (const date of ["", "2026-02-29", "2026-04-31", "2026-13-01", "invalid", "2026-09-20T00:00:00Z"]) {
    assert.equal(getMiyakojimaSunsetGuide(date), null, date)
  }
})
