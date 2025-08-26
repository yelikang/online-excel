import { CellStyle } from '@/types'

export interface NumberFormat {
  type: 'general' | 'number' | 'currency' | 'percentage' | 'date' | 'time' | 'text'
  decimals?: number
  symbol?: string
  pattern?: string
}

export class StyleManager {
  private static defaultStyle: CellStyle = {
    fontSize: 12,
    fontFamily: 'Arial, sans-serif',
    fontWeight: 'normal',
    fontStyle: 'normal',
    color: '#000000',
    backgroundColor: '#ffffff',
    textAlign: 'left',
    verticalAlign: 'middle'
  }

  static getDefaultStyle(): CellStyle {
    return { ...this.defaultStyle }
  }

  static mergeStyles(baseStyle: CellStyle, newStyle: CellStyle): CellStyle {
    return { ...baseStyle, ...newStyle }
  }

  static formatValue(value: any, format?: NumberFormat): string {
    if (value == null) return ''
    
    if (!format || format.type === 'general') {
      return String(value)
    }

    switch (format.type) {
      case 'number':
        const num = Number(value)
        if (isNaN(num)) return String(value)
        return format.decimals !== undefined 
          ? num.toFixed(format.decimals)
          : num.toString()

      case 'currency':
        const currencyNum = Number(value)
        if (isNaN(currencyNum)) return String(value)
        const symbol = format.symbol || '¥'
        const decimals = format.decimals !== undefined ? format.decimals : 2
        return `${symbol}${currencyNum.toFixed(decimals)}`

      case 'percentage':
        const percentNum = Number(value)
        if (isNaN(percentNum)) return String(value)
        const percentDecimals = format.decimals !== undefined ? format.decimals : 2
        return `${(percentNum * 100).toFixed(percentDecimals)}%`

      case 'date':
        const date = new Date(value)
        if (isNaN(date.getTime())) return String(value)
        return format.pattern 
          ? this.formatDate(date, format.pattern)
          : date.toLocaleDateString()

      case 'time':
        const time = new Date(value)
        if (isNaN(time.getTime())) return String(value)
        return format.pattern
          ? this.formatTime(time, format.pattern)
          : time.toLocaleTimeString()

      case 'text':
        return String(value)

      default:
        return String(value)
    }
  }

  private static formatDate(date: Date, pattern: string): string {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

    return pattern
      .replace('YYYY', year.toString())
      .replace('YY', year.toString().slice(-2))
      .replace('MM', month.toString().padStart(2, '0'))
      .replace('M', month.toString())
      .replace('DD', day.toString().padStart(2, '0'))
      .replace('D', day.toString())
  }

  private static formatTime(time: Date, pattern: string): string {
    const hours = time.getHours()
    const minutes = time.getMinutes()
    const seconds = time.getSeconds()

    return pattern
      .replace('HH', hours.toString().padStart(2, '0'))
      .replace('H', hours.toString())
      .replace('mm', minutes.toString().padStart(2, '0'))
      .replace('m', minutes.toString())
      .replace('ss', seconds.toString().padStart(2, '0'))
      .replace('s', seconds.toString())
  }

  static createBorderStyle(
    width: number = 1,
    style: 'solid' | 'dashed' | 'dotted' = 'solid',
    color: string = '#000000'
  ): string {
    return `${width}px ${style} ${color}`
  }

  static parseBorderStyle(borderStyle: string): {
    width: number,
    style: string,
    color: string
  } | null {
    const match = borderStyle.match(/^(\d+)px\s+(\w+)\s+(#[0-9a-fA-F]{6}|rgb\(.+\)|[a-zA-Z]+)$/)
    if (!match) return null

    return {
      width: parseInt(match[1]),
      style: match[2],
      color: match[3]
    }
  }

  static generateCSSStyle(cellStyle: CellStyle): string {
    const styles: string[] = []
    
    if (cellStyle.fontSize) {
      styles.push(`font-size: ${cellStyle.fontSize}px`)
    }
    
    if (cellStyle.fontFamily) {
      styles.push(`font-family: ${cellStyle.fontFamily}`)
    }
    
    if (cellStyle.fontWeight) {
      styles.push(`font-weight: ${cellStyle.fontWeight}`)
    }
    
    if (cellStyle.fontStyle) {
      styles.push(`font-style: ${cellStyle.fontStyle}`)
    }
    
    if (cellStyle.color) {
      styles.push(`color: ${cellStyle.color}`)
    }
    
    if (cellStyle.backgroundColor) {
      styles.push(`background-color: ${cellStyle.backgroundColor}`)
    }
    
    if (cellStyle.textAlign) {
      styles.push(`text-align: ${cellStyle.textAlign}`)
    }
    
    if (cellStyle.verticalAlign) {
      styles.push(`vertical-align: ${cellStyle.verticalAlign}`)
    }

    if (cellStyle.border) {
      const border = cellStyle.border
      if (border.top) styles.push(`border-top: ${border.top}`)
      if (border.right) styles.push(`border-right: ${border.right}`)
      if (border.bottom) styles.push(`border-bottom: ${border.bottom}`)
      if (border.left) styles.push(`border-left: ${border.left}`)
    }

    return styles.join('; ')
  }

  static rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }).join('')
  }

  static hexToRgb(hex: string): { r: number, g: number, b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  static getContrastColor(backgroundColor: string): string {
    const rgb = this.hexToRgb(backgroundColor)
    if (!rgb) return '#000000'

    const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
    return brightness > 128 ? '#000000' : '#ffffff'
  }

  static createConditionalStyle(value: any, conditions: Array<{
    condition: (val: any) => boolean,
    style: CellStyle
  }>): CellStyle | null {
    for (const { condition, style } of conditions) {
      if (condition(value)) {
        return style
      }
    }
    return null
  }

  static cloneStyle(style: CellStyle): CellStyle {
    return JSON.parse(JSON.stringify(style))
  }
}