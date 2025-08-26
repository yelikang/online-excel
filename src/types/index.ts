export interface CellPosition {
  row: number
  col: number
}

export interface CellRange {
  startRow: number
  startCol: number
  endRow: number
  endCol: number
}

export interface CellStyle {
  fontSize?: number
  fontFamily?: string
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  color?: string
  backgroundColor?: string
  border?: BorderStyle
  textAlign?: 'left' | 'center' | 'right'
  verticalAlign?: 'top' | 'middle' | 'bottom'
}

export interface BorderStyle {
  top?: string
  right?: string
  bottom?: string
  left?: string
}

export interface CellData {
  value: any
  formula?: string
  style?: CellStyle
  type?: 'text' | 'number' | 'boolean' | 'date'
  validation?: CellValidation
}

export interface CellValidation {
  type: 'range' | 'list' | 'regex' | 'custom'
  config: any
  message?: string
}

export interface WorksheetData {
  cells: { [key: string]: CellData }
  rows: number
  cols: number
  name: string
}

export interface VirtualScrollConfig {
  itemHeight: number
  itemWidth: number
  viewportHeight: number
  viewportWidth: number
  totalRows: number
  totalCols: number
  bufferSize: number
}

export interface ScrollPosition {
  scrollTop: number
  scrollLeft: number
}

export interface RenderRange {
  startRow: number
  endRow: number
  startCol: number
  endCol: number
}

export interface FormulaToken {
  type: 'NUMBER' | 'FUNCTION' | 'OPERATOR' | 'CELL_REF' | 'PARENTHESIS' | 'STRING'
  value: string
  position: number
}

export interface ASTNode {
  type: string
  value?: any
  children?: ASTNode[]
}

export interface CellReference {
  row: number
  col: number
  sheet?: string
}

export interface DependencyNode {
  cellRef: string
  dependencies: Set<string>
  dependents: Set<string>
  formula?: string
  value?: any
}