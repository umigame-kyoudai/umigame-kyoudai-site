// LINE login returns to the current URL. Keep its preselection parameters in
// sync with manual edits so they cannot overwrite the saved draft on return.
export function replaceBookingSelectionQuery(field: 'plan' | 'date', value: string): void {
  const url = new URL(window.location.href)
  if (value) url.searchParams.set(field, value)
  else url.searchParams.delete(field)
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}
