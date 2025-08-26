import { WorksheetData, CellData } from '@/types'

export interface ImportOptions {
  skipEmptyRows?: boolean
  skipEmptyColumns?: boolean
  startRow?: number
  startColumn?: number
  encoding?: string
}

export interface ExportOptions {
  format: 'xlsx' | 'csv' | 'json' | 'txt'
  includeFormulas?: boolean
  includeStyles?: boolean
  range?: {
    startRow: number
    startCol: number
    endRow: number
    endCol: number
  }
}

export class ImportExportManager {
  static async importFromCSV(file: File, options: ImportOptions = {}): Promise<WorksheetData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string
          const worksheet = this.parseCSV(content, options)
          resolve(worksheet)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file, options.encoding || 'UTF-8')
    })
  }

  static async importFromJSON(file: File): Promise<WorksheetData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string
          const data = JSON.parse(content)
          const worksheet = this.parseJSON(data)
          resolve(worksheet)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file)
    })
  }

  static async importFromExcel(file: File): Promise<WorksheetData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer
          const worksheet = await this.parseExcel(arrayBuffer)
          resolve(worksheet)
        } catch (error) {
          reject(error)
        }
      }
      
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsArrayBuffer(file)
    })
  }

  private static parseCSV(content: string, options: ImportOptions): WorksheetData {
    const lines = content.split('\n')
    const cells: { [key: string]: CellData } = {}
    let maxRows = 0
    let maxCols = 0

    const startRow = options.startRow || 0
    const startCol = options.startColumn || 0

    lines.forEach((line, lineIndex) => {
      if (options.skipEmptyRows && !line.trim()) return
      
      const values = this.parseCSVLine(line)
      
      values.forEach((value, colIndex) => {
        if (options.skipEmptyColumns && !value.trim()) return
        
        const row = startRow + lineIndex
        const col = startCol + colIndex
        const key = `${row},${col}`
        
        cells[key] = {
          value: this.parseValue(value),
          type: this.detectType(value)
        }
        
        maxRows = Math.max(maxRows, row + 1)
        maxCols = Math.max(maxCols, col + 1)
      })
    })

    return {
      name: 'Imported Sheet',
      rows: maxRows || 1000,
      cols: maxCols || 100,
      cells
    }
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current)
    return result
  }

  private static parseJSON(data: any): WorksheetData {
    if (Array.isArray(data)) {
      return this.parseArrayData(data)
    } else if (data.worksheets && Array.isArray(data.worksheets)) {
      return data.worksheets[0] || this.createEmptyWorksheet()
    } else {
      return this.createEmptyWorksheet()
    }
  }

  private static parseArrayData(data: any[]): WorksheetData {
    const cells: { [key: string]: CellData } = {}
    let maxCols = 0

    data.forEach((row, rowIndex) => {
      if (Array.isArray(row)) {
        row.forEach((value, colIndex) => {
          const key = `${rowIndex},${colIndex}`
          cells[key] = {
            value: this.parseValue(value),
            type: this.detectType(value)
          }
          maxCols = Math.max(maxCols, colIndex + 1)
        })
      } else if (typeof row === 'object') {
        Object.keys(row).forEach((key, colIndex) => {
          const cellKey = `${rowIndex},${colIndex}`
          cells[cellKey] = {
            value: this.parseValue(row[key]),
            type: this.detectType(row[key])
          }
          maxCols = Math.max(maxCols, colIndex + 1)
        })
      }
    })

    return {
      name: 'Imported Sheet',
      rows: data.length || 1000,
      cols: maxCols || 100,
      cells
    }
  }

  private static async parseExcel(arrayBuffer: ArrayBuffer): Promise<WorksheetData> {
    throw new Error('Excel导入需要第三方库支持，当前为演示版本')
  }

  private static parseValue(value: any): any {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      
      if (trimmed === '') return ''
      if (trimmed === 'true') return true
      if (trimmed === 'false') return false
      
      const num = Number(trimmed)
      if (!isNaN(num) && trimmed !== '') return num
      
      const date = Date.parse(trimmed)
      if (!isNaN(date) && /\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        return new Date(date)
      }
    }
    
    return value
  }

  private static detectType(value: any): 'text' | 'number' | 'boolean' | 'date' {
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'number') return 'number'
    if (value instanceof Date) return 'date'
    return 'text'
  }

  static exportToCSV(worksheet: WorksheetData, options: ExportOptions = { format: 'csv' }): string {
    const range = options.range || {
      startRow: 0,
      startCol: 0,
      endRow: this.getMaxRow(worksheet),
      endCol: this.getMaxCol(worksheet)
    }

    const rows: string[] = []
    
    for (let row = range.startRow; row <= range.endRow; row++) {
      const cols: string[] = []
      
      for (let col = range.startCol; col <= range.endCol; col++) {
        const key = `${row},${col}`
        const cell = worksheet.cells[key]
        let value = ''
        
        if (cell) {
          if (options.includeFormulas && cell.formula) {
            value = cell.formula
          } else {
            value = String(cell.value || '')
          }
        }
        
        cols.push(this.escapeCSVValue(value))
      }
      
      rows.push(cols.join(','))
    }
    
    return rows.join('\n')
  }

  static exportToJSON(worksheet: WorksheetData, options: ExportOptions = { format: 'json' }): string {
    const data = {
      name: worksheet.name,
      rows: worksheet.rows,
      cols: worksheet.cols,
      cells: {} as { [key: string]: any }
    }

    Object.keys(worksheet.cells).forEach(key => {
      const cell = worksheet.cells[key]
      const exportCell: any = {
        value: cell.value,
        type: cell.type
      }
      
      if (options.includeFormulas && cell.formula) {
        exportCell.formula = cell.formula
      }
      
      if (options.includeStyles && cell.style) {
        exportCell.style = cell.style
      }
      
      if (cell.validation) {
        exportCell.validation = cell.validation
      }
      
      data.cells[key] = exportCell
    })

    return JSON.stringify(data, null, 2)
  }

  static exportToTXT(worksheet: WorksheetData, options: ExportOptions = { format: 'txt' }): string {
    return this.exportToCSV(worksheet, options).replace(/,/g, '\t')
  }

  static async downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    
    URL.revokeObjectURL(url)
  }

  private static escapeCSVValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return '"' + value.replace(/"/g, '""') + '"'
    }
    return value
  }

  private static getMaxRow(worksheet: WorksheetData): number {
    let maxRow = 0
    Object.keys(worksheet.cells).forEach(key => {
      const row = parseInt(key.split(',')[0])
      maxRow = Math.max(maxRow, row)
    })
    return maxRow
  }

  private static getMaxCol(worksheet: WorksheetData): number {
    let maxCol = 0
    Object.keys(worksheet.cells).forEach(key => {
      const col = parseInt(key.split(',')[1])
      maxCol = Math.max(maxCol, col)
    })
    return maxCol
  }

  private static createEmptyWorksheet(): WorksheetData {
    return {
      name: 'Empty Sheet',
      rows: 1000,
      cols: 100,
      cells: {}
    }
  }

  static getFileExtension(format: string): string {
    switch (format) {
      case 'xlsx': return '.xlsx'
      case 'csv': return '.csv'
      case 'json': return '.json'
      case 'txt': return '.txt'
      default: return '.txt'
    }
  }

  static getMimeType(format: string): string {
    switch (format) {
      case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      case 'csv': return 'text/csv'
      case 'json': return 'application/json'
      case 'txt': return 'text/plain'
      default: return 'text/plain'
    }
  }
}