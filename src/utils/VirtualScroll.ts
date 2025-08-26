import { VirtualScrollConfig, ScrollPosition, RenderRange } from '@/types'

export class VirtualScrollManager {
  private config: VirtualScrollConfig
  private scrollPosition: ScrollPosition = { scrollTop: 0, scrollLeft: 0 }
  private renderRange: RenderRange = { startRow: 0, endRow: 0, startCol: 0, endCol: 0 }
  private callbacks: Array<(range: RenderRange) => void> = []

  constructor(config: VirtualScrollConfig) {
    this.config = config
    this.updateRenderRange()
  }

  updateConfig(config: Partial<VirtualScrollConfig>) {
    this.config = { ...this.config, ...config }
    this.updateRenderRange()
  }

  setScrollPosition(scrollTop: number, scrollLeft: number) {
    this.scrollPosition = { scrollTop, scrollLeft }
    this.updateRenderRange()
    this.notifyCallbacks()
  }

  private updateRenderRange() {
    const { itemHeight, itemWidth, viewportHeight, viewportWidth, totalRows, totalCols, bufferSize } = this.config
    const { scrollTop, scrollLeft } = this.scrollPosition

    const visibleStartRow = Math.floor(scrollTop / itemHeight)
    const visibleEndRow = Math.min(
      totalRows - 1,
      Math.ceil((scrollTop + viewportHeight) / itemHeight) - 1
    )
    const visibleStartCol = Math.floor(scrollLeft / itemWidth)
    const visibleEndCol = Math.min(
      totalCols - 1,
      Math.ceil((scrollLeft + viewportWidth) / itemWidth) - 1
    )

    this.renderRange = {
      startRow: Math.max(0, visibleStartRow - bufferSize),
      endRow: Math.min(totalRows - 1, visibleEndRow + bufferSize),
      startCol: Math.max(0, visibleStartCol - bufferSize),
      endCol: Math.min(totalCols - 1, visibleEndCol + bufferSize)
    }
  }

  getRenderRange(): RenderRange {
    return { ...this.renderRange }
  }

  getTotalSize() {
    return {
      width: this.config.totalCols * this.config.itemWidth,
      height: this.config.totalRows * this.config.itemHeight
    }
  }

  getScrollPosition(): ScrollPosition {
    return { ...this.scrollPosition }
  }

  onRangeChange(callback: (range: RenderRange) => void) {
    this.callbacks.push(callback)
  }

  private notifyCallbacks() {
    this.callbacks.forEach(callback => callback(this.renderRange))
  }

  getCellPosition(row: number, col: number) {
    return {
      x: col * this.config.itemWidth,
      y: row * this.config.itemHeight
    }
  }

  getCellFromPosition(x: number, y: number) {
    const { scrollLeft, scrollTop } = this.scrollPosition
    const actualX = x + scrollLeft
    const actualY = y + scrollTop
    
    return {
      row: Math.floor(actualY / this.config.itemHeight),
      col: Math.floor(actualX / this.config.itemWidth)
    }
  }

  isInViewport(row: number, col: number): boolean {
    const { scrollTop, scrollLeft } = this.scrollPosition
    const { viewportHeight, viewportWidth, itemHeight, itemWidth } = this.config
    
    const cellTop = row * itemHeight
    const cellLeft = col * itemWidth
    
    return cellTop >= scrollTop && 
           cellTop < scrollTop + viewportHeight &&
           cellLeft >= scrollLeft && 
           cellLeft < scrollLeft + viewportWidth
  }
}