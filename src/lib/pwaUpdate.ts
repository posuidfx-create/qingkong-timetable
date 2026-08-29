export type PwaUpdatePromptState = "hidden" | "available"
export type PwaUpdateFunction = (reloadPage?: boolean) => Promise<void>

export function showPwaUpdatePrompt(): PwaUpdatePromptState {
  return "available"
}

export function dismissPwaUpdatePrompt(): PwaUpdatePromptState {
  return "hidden"
}

export function applyPwaUpdate(update: PwaUpdateFunction): Promise<void> {
  return update(true)
}
