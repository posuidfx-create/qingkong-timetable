let fallbackCounter = 0

export function createUniqueId(): string {
  const cryptoApi = globalThis.crypto
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID()
  }

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hexadecimal = [...bytes].map((byte) => byte.toString(16).padStart(2, "0"))
    return [
      hexadecimal.slice(0, 4).join(""),
      hexadecimal.slice(4, 6).join(""),
      hexadecimal.slice(6, 8).join(""),
      hexadecimal.slice(8, 10).join(""),
      hexadecimal.slice(10, 16).join(""),
    ].join("-")
  }

  fallbackCounter += 1
  return `course-${Math.random().toString(36).slice(2, 10)}-${fallbackCounter.toString(36)}`
}
