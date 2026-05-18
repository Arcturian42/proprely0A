import { describe, expect, it } from 'vitest'
import { paginate } from './Pager'

describe('paginate', () => {
  const items = Array.from({ length: 47 }, (_, i) => `item-${i + 1}`)

  it('returns the first page', () => {
    expect(paginate(items, 1, 10)).toHaveLength(10)
    expect(paginate(items, 1, 10)[0]).toBe('item-1')
    expect(paginate(items, 1, 10)[9]).toBe('item-10')
  })

  it('returns the second page', () => {
    const page2 = paginate(items, 2, 10)
    expect(page2[0]).toBe('item-11')
    expect(page2[9]).toBe('item-20')
  })

  it('returns the last partial page', () => {
    const last = paginate(items, 5, 10)
    expect(last).toHaveLength(7) // items 41–47
    expect(last[0]).toBe('item-41')
    expect(last[6]).toBe('item-47')
  })

  it('returns empty for a page beyond total', () => {
    expect(paginate(items, 99, 10)).toEqual([])
  })

  it('handles empty array', () => {
    expect(paginate([], 1, 10)).toEqual([])
  })

  it('handles page size larger than total', () => {
    const small = ['a', 'b', 'c']
    expect(paginate(small, 1, 100)).toEqual(['a', 'b', 'c'])
  })
})
