interface CacheItem<T> {
  value: T
  timestamp: number
  accessCount: number
}

export class LRUCache<T> {
  private cache: Map<string, CacheItem<T>> = new Map()
  private maxSize: number
  private ttl: number

  constructor(maxSize: number = 1000, ttl: number = 5 * 60 * 1000) { // 默认5分钟TTL
    this.maxSize = maxSize
    this.ttl = ttl
  }

  get(key: string): T | null {
    const item = this.cache.get(key)
    
    if (!item) return null
    
    const now = Date.now()
    if (now - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }
    
    item.accessCount++
    item.timestamp = now
    
    this.cache.delete(key)
    this.cache.set(key, item)
    
    return item.value
  }

  set(key: string, value: T): void {
    const now = Date.now()
    
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      this.evictLRU()
    }
    
    this.cache.set(key, {
      value,
      timestamp: now,
      accessCount: 1
    })
  }

  private evictLRU(): void {
    const entries = Array.from(this.cache.entries())
    entries.sort((a, b) => {
      const scoreA = a[1].timestamp + (a[1].accessCount * 1000)
      const scoreB = b[1].timestamp + (b[1].accessCount * 1000)
      return scoreA - scoreB
    })
    
    const [keyToRemove] = entries[0]
    this.cache.delete(keyToRemove)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

export class ObjectPool<T> {
  private pool: T[] = []
  private createFn: () => T
  private resetFn?: (item: T) => void
  private maxSize: number

  constructor(createFn: () => T, resetFn?: (item: T) => void, maxSize: number = 100) {
    this.createFn = createFn
    this.resetFn = resetFn
    this.maxSize = maxSize
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!
    }
    return this.createFn()
  }

  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      if (this.resetFn) {
        this.resetFn(item)
      }
      this.pool.push(item)
    }
  }

  clear(): void {
    this.pool.length = 0
  }
}

export class FrameScheduler {
  private tasks: Array<() => void> = []
  private isRunning = false
  private maxTimePerFrame = 16 // 1000ms/60fps ≈ 16.67ms

  schedule(task: () => void): void {
    this.tasks.push(task)
    this.start()
  }

  private start(): void {
    if (this.isRunning) return
    
    this.isRunning = true
    this.processFrame()
  }

  private processFrame(): void {
    const startTime = performance.now()
    
    while (this.tasks.length > 0 && (performance.now() - startTime) < this.maxTimePerFrame) {
      const task = this.tasks.shift()!
      try {
        task()
      } catch (error) {
        console.error('Frame task error:', error)
      }
    }
    
    if (this.tasks.length > 0) {
      requestAnimationFrame(() => this.processFrame())
    } else {
      this.isRunning = false
    }
  }
}

export class LazyLoader<T> {
  private loadFn: () => Promise<T>
  private promise: Promise<T> | null = null
  private value: T | null = null
  private loaded = false

  constructor(loadFn: () => Promise<T>) {
    this.loadFn = loadFn
  }

  async load(): Promise<T> {
    if (this.loaded) {
      return this.value!
    }
    
    if (this.promise) {
      return this.promise
    }
    
    this.promise = this.loadFn().then(value => {
      this.value = value
      this.loaded = true
      this.promise = null
      return value
    })
    
    return this.promise
  }

  isLoaded(): boolean {
    return this.loaded
  }

  getValue(): T | null {
    return this.value
  }
}

export class BatchProcessor<T> {
  private items: T[] = []
  private processFn: (items: T[]) => void
  private batchSize: number
  private delay: number
  private timeoutId: number | null = null

  constructor(processFn: (items: T[]) => void, batchSize: number = 100, delay: number = 50) {
    this.processFn = processFn
    this.batchSize = batchSize
    this.delay = delay
  }

  add(item: T): void {
    this.items.push(item)
    
    if (this.items.length >= this.batchSize) {
      this.flush()
    } else if (!this.timeoutId) {
      this.timeoutId = window.setTimeout(() => this.flush(), this.delay)
    }
  }

  flush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
    
    if (this.items.length > 0) {
      const batch = this.items.splice(0, this.items.length)
      try {
        this.processFn(batch)
      } catch (error) {
        console.error('Batch processing error:', error)
      }
    }
  }
}

export class MemoryMonitor {
  private callbacks: Array<(info: any) => void> = []
  private intervalId: number | null = null
  private threshold: number

  constructor(threshold: number = 50 * 1024 * 1024) { // 50MB
    this.threshold = threshold
  }

  start(interval: number = 30000): void { // 30秒检查一次
    if (this.intervalId) return
    
    this.intervalId = window.setInterval(() => {
      this.checkMemory()
    }, interval)
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  onMemoryWarning(callback: (info: any) => void): void {
    this.callbacks.push(callback)
  }

  private checkMemory(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      
      if (memory.usedJSHeapSize > this.threshold) {
        const info = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
          limit: memory.jsHeapSizeLimit,
          timestamp: Date.now()
        }
        
        this.callbacks.forEach(callback => {
          try {
            callback(info)
          } catch (error) {
            console.error('Memory warning callback error:', error)
          }
        })
      }
    }
  }
}

export class RenderThrottler {
  private lastRender = 0
  private minInterval: number
  private pendingRender: number | null = null

  constructor(fps: number = 60) {
    this.minInterval = 1000 / fps
  }

  throttle(renderFn: () => void): void {
    const now = performance.now()
    const timeSinceLastRender = now - this.lastRender
    
    if (timeSinceLastRender >= this.minInterval) {
      if (this.pendingRender) {
        cancelAnimationFrame(this.pendingRender)
        this.pendingRender = null
      }
      
      renderFn()
      this.lastRender = now
    } else if (!this.pendingRender) {
      this.pendingRender = requestAnimationFrame(() => {
        this.pendingRender = null
        renderFn()
        this.lastRender = performance.now()
      })
    }
  }
}

export class PerformanceProfiler {
  private marks: Map<string, number> = new Map()
  private measures: Array<{ name: string, duration: number, timestamp: number }> = []

  mark(name: string): void {
    this.marks.set(name, performance.now())
  }

  measure(name: string, startMark?: string): number {
    const endTime = performance.now()
    const startTime = startMark ? this.marks.get(startMark) || endTime : this.marks.get(name) || endTime
    const duration = endTime - startTime
    
    this.measures.push({
      name,
      duration,
      timestamp: endTime
    })
    
    if (startMark) {
      this.marks.delete(startMark)
    } else {
      this.marks.delete(name)
    }
    
    return duration
  }

  getProfile(): Array<{ name: string, duration: number, timestamp: number }> {
    return [...this.measures]
  }

  clear(): void {
    this.marks.clear()
    this.measures.length = 0
  }

  logProfile(name?: string): void {
    const measures = name 
      ? this.measures.filter(m => m.name === name)
      : this.measures
      
    console.group(`Performance Profile ${name ? `(${name})` : ''}`)
    measures.forEach(measure => {
      console.log(`${measure.name}: ${measure.duration.toFixed(2)}ms`)
    })
    console.groupEnd()
  }
}

export class PerformanceOptimizer {
  static cache = new LRUCache<any>()
  static frameScheduler = new FrameScheduler()
  static memoryMonitor = new MemoryMonitor()
  static renderThrottler = new RenderThrottler()
  static profiler = new PerformanceProfiler()
  
  static createObjectPool<T>(createFn: () => T, resetFn?: (item: T) => void, maxSize?: number): ObjectPool<T> {
    return new ObjectPool(createFn, resetFn, maxSize)
  }
  
  static createBatchProcessor<T>(processFn: (items: T[]) => void, batchSize?: number, delay?: number): BatchProcessor<T> {
    return new BatchProcessor(processFn, batchSize, delay)
  }
  
  static createLazyLoader<T>(loadFn: () => Promise<T>): LazyLoader<T> {
    return new LazyLoader(loadFn)
  }
  
  static debounce<T extends (...args: any[]) => any>(func: T, delay: number): T {
    let timeoutId: number | null = null
    
    return ((...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      timeoutId = window.setTimeout(() => {
        func(...args)
      }, delay)
    }) as T
  }
  
  static throttle<T extends (...args: any[]) => any>(func: T, delay: number): T {
    let lastCall = 0
    
    return ((...args: Parameters<T>) => {
      const now = Date.now()
      if (now - lastCall >= delay) {
        lastCall = now
        return func(...args)
      }
    }) as T
  }
  
  static memoize<T extends (...args: any[]) => any>(func: T, keyFn?: (...args: Parameters<T>) => string): T {
    const cache = new Map<string, ReturnType<T>>()
    
    return ((...args: Parameters<T>) => {
      const key = keyFn ? keyFn(...args) : JSON.stringify(args)
      
      if (cache.has(key)) {
        return cache.get(key)!
      }
      
      const result = func(...args)
      cache.set(key, result)
      return result
    }) as T
  }
}