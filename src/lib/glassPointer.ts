/**
 * Keeps the decorative glass highlight local to the window under the pointer.
 * It deliberately only writes CSS custom properties; no application state is
 * involved in this visual affordance.
 */
export function updateGlassPointerOrigin(element: HTMLElement, clientX: number, clientY: number): void {
  const rect = element.getBoundingClientRect()
  const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
  const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))

  element.style.setProperty("--glass-pointer-x", `${x}%`)
  element.style.setProperty("--glass-pointer-y", `${y}%`)
}
