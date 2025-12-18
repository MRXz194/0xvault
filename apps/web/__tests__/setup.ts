// Ensure Web Crypto is available in Node test runtime
import { webcrypto } from 'crypto'

if (!(globalThis as any).crypto) {
  ;(globalThis as any).crypto = webcrypto as unknown as Crypto
}
