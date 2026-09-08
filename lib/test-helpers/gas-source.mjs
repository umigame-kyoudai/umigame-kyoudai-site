import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

// Exercise a pending release when present, otherwise the promoted Code.gs.
export function gasSourcePath(project = 'umigame-reservation-admin') {
  const directory = path.join(process.cwd(), 'apps-script', project)
  const pending = path.join(directory, 'Code.next.gs')
  return existsSync(pending) ? pending : path.join(directory, 'Code.gs')
}

export const readGasSource = (project) => readFileSync(gasSourcePath(project), 'utf8')
