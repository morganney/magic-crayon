import { describe, expect, it } from 'vitest'

import { FixedStack, FixedStackEvents } from '../src/fixedStack.js'

describe('FixedStack', () => {
  it('throws for invalid max size', () => {
    expect(() => new FixedStack<number>(0)).toThrow('positive maxSize')
  })

  it('pushes, peeks, pops, and clears with size change events', () => {
    const stack = new FixedStack<number>(2)
    const sizes: number[] = []

    stack.addEventListener(FixedStackEvents.SIZE_CHANGE, event => {
      const evt = event as CustomEvent<number>

      sizes.push(evt.detail)
    })

    stack.push(1)
    stack.push(2)
    stack.push(3)

    expect(stack.size).toBe(2)
    expect(stack.peek()).toBe(3)
    expect(stack.pop()).toBe(3)
    expect(stack.pop()).toBe(2)

    stack.push(4)
    stack.clear()

    expect(stack.size).toBe(0)
    expect(sizes).toEqual([1, 2, 2, 1, 0, 1, 0])
  })

  it('throws when peeking or popping an empty stack', () => {
    const stack = new FixedStack<number>()

    expect(() => stack.peek()).toThrow('empty FixedStack')
    expect(() => stack.pop()).toThrow('empty FixedStack')
  })
})
