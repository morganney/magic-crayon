const FixedStackEvents = {
  SIZE_CHANGE: 'FixedStackSizeChange'
} as const

class FixedStack<T> extends EventTarget {
  protected items: T[] = []
  protected maxSize: number

  constructor(size: number = 3) {
    super()

    if (size <= 0) {
      throw new Error('FixedStack must have a positive maxSize.')
    }

    this.maxSize = size
  }

  get size(): number {
    return this.items.length
  }

  protected triggerSizeChangeEvent(): void {
    this.dispatchEvent(
      new CustomEvent(FixedStackEvents.SIZE_CHANGE, { detail: this.size })
    )
  }

  push(item: T) {
    if (this.items.length === this.maxSize) {
      this.items.pop()
    }

    this.items.unshift(item)
    this.triggerSizeChangeEvent()
  }

  pop(): T {
    let item = null

    if (this.items.length === 0) {
      throw new Error('Cannot pop on an empty FixedStack.')
    }

    item = this.items.shift() as T
    this.triggerSizeChangeEvent()

    return item
  }

  peek(): T {
    if (!this.items.length) {
      throw new Error('Cannot peek on an empty FixedStack.')
    }

    return this.items[0]
  }

  clear(): void {
    this.items = []
    this.triggerSizeChangeEvent()
  }
}

export { FixedStack, FixedStackEvents }
