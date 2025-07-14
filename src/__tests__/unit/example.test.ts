import { describe, it, expect } from 'vitest'

describe('Example Test Suite', () => {
  it('should pass a basic assertion', () => {
    expect(2 + 2).toBe(4)
  })

  it('should work with async operations', async () => {
    const promise = Promise.resolve('hello')
    await expect(promise).resolves.toBe('hello')
  })

  it('should handle arrays and objects', () => {
    const arr = [1, 2, 3]
    expect(arr).toHaveLength(3)
    expect(arr).toContain(2)

    const obj = { name: 'test', value: 42 }
    expect(obj).toHaveProperty('name', 'test')
    expect(obj).toMatchObject({ value: 42 })
  })
})