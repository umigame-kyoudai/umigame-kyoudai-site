import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import test from 'node:test'

const source = fs.readFileSync(new URL('../apps-script/umigame-reservation-webapp/App.html', import.meta.url), 'utf8')
const cancelSource = source.slice(source.indexOf('    async function cancelLinePreview()'), source.indexOf('    async function confirmLineSend()'))

test('closing LINE preview waits for the refreshed version before allowing another edit', async () => {
  let resolve
  let calls = 0
  const context = vm.createContext({
    els: { lineModal: { hidden: false }, lineCancelButton: { disabled: false }, lineConfirmButton: { disabled: false } },
    state: { pendingLine: { token: 'local-token' } },
    gas: () => { calls++; return new Promise(done => { resolve = done }) },
    replaceBooking: booking => { context.state.booking = booking },
    renderDrawer() {}, showToast() {},
  })
  vm.runInContext(cancelSource, context)
  const closing = context.cancelLinePreview()
  assert.equal(context.els.lineModal.hidden, false)
  assert.equal(context.els.lineConfirmButton.disabled, true)
  await context.cancelLinePreview()
  assert.equal(calls, 1)
  resolve({ booking: { key: 'EXISTING', version: 'fresh-version' } })
  await closing
  assert.equal(context.state.booking.version, 'fresh-version')
  assert.equal(context.els.lineModal.hidden, true)
  assert.equal(context.state.pendingLine, null)
})
