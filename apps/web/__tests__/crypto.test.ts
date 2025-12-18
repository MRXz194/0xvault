import { describe, it, expect } from 'vitest'
import { deriveKeysFromPassword, encryptData, decryptData } from '@/lib/supabase/crypto'

// A fixed 16-byte salt in hex (32 hex chars)
const FIXED_SALT = '00112233445566778899aabbccddeeff'

describe('crypto helpers', () => {
  it('derive -> encrypt -> decrypt roundtrip', async () => {
    const pwd = 'correct horse battery staple'
    const { encryptionKey } = await deriveKeysFromPassword(pwd, FIXED_SALT)

    const plaintext = 'Hello 0xVault! '
    const encrypted = await encryptData(plaintext, encryptionKey)
    expect(typeof encrypted).toBe('string')
    expect(encrypted.includes(':')).toBe(true)

    const decrypted = await decryptData(encrypted, encryptionKey)
    expect(decrypted).toBe(plaintext)
  })

  it('fails to decrypt with a different key', async () => {
    const { encryptionKey: k1 } = await deriveKeysFromPassword('password-1', FIXED_SALT)
    const { encryptionKey: k2 } = await deriveKeysFromPassword('password-2', FIXED_SALT)

    const message = 'secret'
    const enc = await encryptData(message, k1)
    const dec = await decryptData(enc, k2)

    // Our implementation returns an error string on failure
    expect(typeof dec).toBe('string')
    expect(dec.toLowerCase()).toContain('error')
  })
})
