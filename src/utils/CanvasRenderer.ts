import { CellData, CellStyle, RenderRange, CellPosition } from '@/types'

interface CanvasLayer {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  zIndex: number
}

export class CanvasRenderer {
  private container: HTMLElement
  private layers: Map<string, CanvasLayer> = new Map()
  private cellWidth: number
  private cellHeight: number
  private defaultStyle: CellStyle
  private devicePixelRatio: number

  constructor(
    container: HTMLElement, 
    cellWidth = 100, 
    cellHeight = 25,
    defaultStyle: CellStyle = {}
  ) {
    this.container = container
    this.cellWidth = cellWidth
    this.cellHeight = cellHeight
    this.devicePixelRatio = window.devicePixelRatio || 1
    this.defaultStyle = {
      fontSize: 12,
      fontFamily: 'Arial, sans-serif',
      color: '#000000',
      backgroundColor: '#ffffff',
      textAlign: 'left',
      verticalAlign: 'middle',
      ...defaultStyle
    }
    
    this.initLayers()
  }

  private initLayers() {
    const layerConfigs = [
      { name: 'background', zIndex: 1 },
      { name: 'grid', zIndex: 2 },
      { name: 'content', zIndex: 3 },
      { name: 'selection', zIndex: 4 },
      { name: 'editor', zIndex: 5 }
    ]

    layerConfigs.forEach(config => {
      const canvas = this.createCanvas()
      canvas.style.zIndex = config.zIndex.toString()
      this.container.appendChild(canvas)
      
      const ctx = canvas.getContext('2d')!
      ctx.scale(this.devicePixelRatio, this.devicePixelRatio)
      
      this.layers.set(config.name, { canvas, ctx, zIndex: config.zIndex })
    })
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    const rect = this.container.getBoundingClientRect()
    
    canvas.width = rect.width * this.devicePixelRatio
    canvas.height = rect.height * this.devicePixelRatio
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.pointerEvents = 'none'
    
    return canvas
  }

  resize(width: number, height: number) {
    this.layers.forEach(layer => {
      layer.canvas.width = width * this.devicePixelRatio
      layer.canvas.height = height * this.devicePixelRatio
      layer.canvas.style.width = width + 'px'
      layer.canvas.style.height = height + 'px'
      layer.ctx.scale(this.devicePixelRatio, this.devicePixelRatio)
    })
  }

  clearLayer(layerName: string) {
    const layer = this.layers.get(layerName)
    if (layer) {
      layer.ctx.clearRect(0, 0, layer.canvas.width / this.devicePixelRatio, layer.canvas.height / this.devicePixelRatio)
    }
  }

  clearAll() {
    this.layers.forEach((_, layerName) => {
      this.clearLayer(layerName)
    })
  }

  renderGrid(range: RenderRange, scrollLeft: number, scrollTop: number) {
    const ctx = this.layers.get('grid')?.ctx
    if (!ctx) return

    this.clearLayer('grid')

    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 1
    ctx.beginPath()

    for (let row = range.startRow; row <= range.endRow + 1; row++) {
      const y = row * this.cellHeight - scrollTop
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(this.container.clientWidth, y + 0.5)
    }

    for (let col = range.startCol; col <= range.endCol + 1; col++) {
      const x = col * this.cellWidth - scrollLeft
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, this.container.clientHeight)
    }

    ctx.stroke()
  }

  renderCell(
    row: number, 
    col: number, 
    cellData: CellData | null, 
    scrollLeft: number, 
    scrollTop: number
  ) {
    const ctx = this.layers.get('content')?.ctx
    if (!ctx) return

    const x = col * this.cellWidth - scrollLeft
    const y = row * this.cellHeight - scrollTop
    const style = { ...this.defaultStyle, ...(cellData?.style || {}) }

    if (x + this.cellWidth < 0 || x > this.container.clientWidth ||
        y + this.cellHeight < 0 || y > this.container.clientHeight) {
      return
    }

    if (style.backgroundColor && style.backgroundColor !== '#ffffff') {
      ctx.fillStyle = style.backgroundColor
      ctx.fillRect(x, y, this.cellWidth, this.cellHeight)
    }

    if (cellData?.value != null) {
      this.renderText(ctx, String(cellData.value), x, y, this.cellWidth, this.cellHeight, style)
    }

    if (style.border) {
      this.renderBorder(ctx, x, y, this.cellWidth, this.cellHeight, style.border)
    }
  }

  private renderText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    style: CellStyle
  ) {
    ctx.fillStyle = style.color || '#000000'
    ctx.font = `${style.fontStyle || 'normal'} ${style.fontWeight || 'normal'} ${style.fontSize || 12}px ${style.fontFamily || 'Arial'}`

    const padding = 4
    const textWidth = width - padding * 2
    const textHeight = height - padding * 2

    let displayText = text
    const textMetrics = ctx.measureText(text)
    
    if (textMetrics.width > textWidth) {
      while (displayText.length > 0 && ctx.measureText(displayText + '...').width > textWidth) {
        displayText = displayText.slice(0, -1)
      }
      displayText += '...'
    }

    let textX = x + padding
    if (style.textAlign === 'center') {
      textX = x + width / 2
    } else if (style.textAlign === 'right') {
      textX = x + width - padding
    }

    let textY = y + height / 2
    if (style.verticalAlign === 'top') {
      textY = y + (style.fontSize || 12)
    } else if (style.verticalAlign === 'bottom') {
      textY = y + height - padding
    }

    ctx.textAlign = style.textAlign || 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(displayText, textX, textY)
  }

  private renderBorder(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    border: any
  ) {
    ctx.lineWidth = 1

    if (border.top) {
      ctx.strokeStyle = border.top
      ctx.beginPath()
      ctx.moveTo(x, y + 0.5)
      ctx.lineTo(x + width, y + 0.5)
      ctx.stroke()
    }

    if (border.right) {
      ctx.strokeStyle = border.right
      ctx.beginPath()
      ctx.moveTo(x + width - 0.5, y)
      ctx.lineTo(x + width - 0.5, y + height)
      ctx.stroke()
    }

    if (border.bottom) {
      ctx.strokeStyle = border.bottom
      ctx.beginPath()
      ctx.moveTo(x, y + height - 0.5)
      ctx.lineTo(x + width, y + height - 0.5)
      ctx.stroke()
    }

    if (border.left) {
      ctx.strokeStyle = border.left
      ctx.beginPath()
      ctx.moveTo(x + 0.5, y)
      ctx.lineTo(x + 0.5, y + height)
      ctx.stroke()
    }
  }

  renderSelection(selectedCells: CellPosition[], scrollLeft: number, scrollTop: number) {
    const ctx = this.layers.get('selection')?.ctx
    if (!ctx) return

    this.clearLayer('selection')

    ctx.strokeStyle = '#1890ff'
    ctx.lineWidth = 2
    ctx.fillStyle = 'rgba(24, 144, 255, 0.1)'

    selectedCells.forEach(cell => {
      const x = cell.col * this.cellWidth - scrollLeft
      const y = cell.row * this.cellHeight - scrollTop

      if (x + this.cellWidth >= 0 && x <= this.container.clientWidth &&
          y + this.cellHeight >= 0 && y <= this.container.clientHeight) {
        ctx.fillRect(x, y, this.cellWidth, this.cellHeight)
        ctx.strokeRect(x + 1, y + 1, this.cellWidth - 2, this.cellHeight - 2)
      }
    })
  }

  renderRange(
    range: RenderRange,
    getCellData: (row: number, col: number) => CellData | null,
    scrollLeft: number,
    scrollTop: number
  ) {
    this.clearLayer('content')

    for (let row = range.startRow; row <= range.endRow; row++) {
      for (let col = range.startCol; col <= range.endCol; col++) {
        const cellData = getCellData(row, col)
        this.renderCell(row, col, cellData, scrollLeft, scrollTop)
      }
    }
  }

  getCellFromCoordinates(x: number, y: number, scrollLeft: number, scrollTop: number): CellPosition {
    const actualX = x + scrollLeft
    const actualY = y + scrollTop
    
    return {
      row: Math.floor(actualY / this.cellHeight),
      col: Math.floor(actualX / this.cellWidth)
    }
  }

  getCellBounds(row: number, col: number, scrollLeft: number, scrollTop: number) {
    return {
      x: col * this.cellWidth - scrollLeft,
      y: row * this.cellHeight - scrollTop,
      width: this.cellWidth,
      height: this.cellHeight
    }
  }

  destroy() {
    this.layers.forEach(layer => {
      this.container.removeChild(layer.canvas)
    })
    this.layers.clear()
  }
}