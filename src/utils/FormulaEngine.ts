import { FormulaToken, ASTNode, CellReference, DependencyNode } from '@/types'

enum TokenType {
  NUMBER = 'NUMBER',
  FUNCTION = 'FUNCTION',
  OPERATOR = 'OPERATOR',
  CELL_REF = 'CELL_REF',
  PARENTHESIS = 'PARENTHESIS',
  STRING = 'STRING',
  COMMA = 'COMMA',
  EOF = 'EOF'
}

export class FormulaLexer {
  private input: string
  private position: number = 0
  private current: string = ''

  constructor(input: string) {
    this.input = input.trim()
    if (this.input.startsWith('=')) {
      this.input = this.input.substring(1)
    }
    this.current = this.input[this.position] || ''
  }

  private advance() {
    this.position++
    this.current = this.position < this.input.length ? this.input[this.position] : ''
  }

  private skipWhitespace() {
    while (this.current && /\s/.test(this.current)) {
      this.advance()
    }
  }

  private readNumber(): string {
    let result = ''
    while (this.current && (/\d/.test(this.current) || this.current === '.')) {
      result += this.current
      this.advance()
    }
    return result
  }

  private readString(): string {
    let result = ''
    this.advance() // 跳过开始的引号
    while (this.current && this.current !== '"') {
      result += this.current
      this.advance()
    }
    if (this.current === '"') {
      this.advance() // 跳过结束的引号
    }
    return result
  }

  private readIdentifier(): string {
    let result = ''
    while (this.current && /[A-Za-z0-9_]/.test(this.current)) {
      result += this.current
      this.advance()
    }
    return result
  }

  private readCellReference(): string {
    let result = ''
    while (this.current && /[A-Za-z0-9$:]/.test(this.current)) {
      result += this.current
      this.advance()
    }
    return result
  }

  tokenize(): FormulaToken[] {
    const tokens: FormulaToken[] = []

    while (this.position < this.input.length) {
      this.skipWhitespace()
      
      if (!this.current) break

      const startPos = this.position

      if (/\d/.test(this.current)) {
        const value = this.readNumber()
        tokens.push({ type: TokenType.NUMBER, value, position: startPos })
      } else if (this.current === '"') {
        const value = this.readString()
        tokens.push({ type: TokenType.STRING, value, position: startPos })
      } else if (/[A-Z]/.test(this.current)) {
        const value = this.readCellReference()
        if (this.isCellReference(value)) {
          tokens.push({ type: TokenType.CELL_REF, value, position: startPos })
        } else {
          tokens.push({ type: TokenType.FUNCTION, value, position: startPos })
        }
      } else if ('+-*/^%'.includes(this.current)) {
        tokens.push({ type: TokenType.OPERATOR, value: this.current, position: startPos })
        this.advance()
      } else if ('()'.includes(this.current)) {
        tokens.push({ type: TokenType.PARENTHESIS, value: this.current, position: startPos })
        this.advance()
      } else if (this.current === ',') {
        tokens.push({ type: TokenType.COMMA, value: this.current, position: startPos })
        this.advance()
      } else {
        this.advance()
      }
    }

    tokens.push({ type: TokenType.EOF, value: '', position: this.position })
    return tokens
  }

  private isCellReference(value: string): boolean {
    return /^[A-Z]+\d+$/.test(value) || /^[A-Z]+\d+:[A-Z]+\d+$/.test(value)
  }
}

export class FormulaParser {
  private tokens: FormulaToken[]
  private position: number = 0
  private currentToken: FormulaToken

  constructor(tokens: FormulaToken[]) {
    this.tokens = tokens
    this.currentToken = this.tokens[0]
  }

  private advance() {
    this.position++
    if (this.position < this.tokens.length) {
      this.currentToken = this.tokens[this.position]
    }
  }

  private expect(type: string) {
    if (this.currentToken.type !== type) {
      throw new Error(`Expected ${type}, got ${this.currentToken.type}`)
    }
    const token = this.currentToken
    this.advance()
    return token
  }

  parse(): ASTNode {
    return this.parseExpression()
  }

  private parseExpression(): ASTNode {
    let node = this.parseTerm()

    while (this.currentToken.value === '+' || this.currentToken.value === '-') {
      const operator = this.currentToken.value
      this.advance()
      const right = this.parseTerm()
      node = {
        type: 'BinaryOp',
        value: operator,
        children: [node, right]
      }
    }

    return node
  }

  private parseTerm(): ASTNode {
    let node = this.parseFactor()

    while (this.currentToken.value === '*' || this.currentToken.value === '/' || this.currentToken.value === '%') {
      const operator = this.currentToken.value
      this.advance()
      const right = this.parseFactor()
      node = {
        type: 'BinaryOp',
        value: operator,
        children: [node, right]
      }
    }

    return node
  }

  private parseFactor(): ASTNode {
    if (this.currentToken.value === '^') {
      const operator = this.currentToken.value
      this.advance()
      const right = this.parseFactor()
      return {
        type: 'BinaryOp',
        value: operator,
        children: [this.parsePrimary(), right]
      }
    }

    return this.parsePrimary()
  }

  private parsePrimary(): ASTNode {
    if (this.currentToken.type === TokenType.NUMBER) {
      const value = parseFloat(this.currentToken.value)
      this.advance()
      return { type: 'Number', value }
    }

    if (this.currentToken.type === TokenType.STRING) {
      const value = this.currentToken.value
      this.advance()
      return { type: 'String', value }
    }

    if (this.currentToken.type === TokenType.CELL_REF) {
      const value = this.currentToken.value
      this.advance()
      return { type: 'CellRef', value }
    }

    if (this.currentToken.type === TokenType.FUNCTION) {
      return this.parseFunction()
    }

    if (this.currentToken.value === '(') {
      this.advance()
      const node = this.parseExpression()
      this.expect(TokenType.PARENTHESIS)
      return node
    }

    if (this.currentToken.value === '-') {
      this.advance()
      const node = this.parsePrimary()
      return {
        type: 'UnaryOp',
        value: '-',
        children: [node]
      }
    }

    throw new Error(`Unexpected token: ${this.currentToken.value}`)
  }

  private parseFunction(): ASTNode {
    const functionName = this.currentToken.value
    this.advance()
    this.expect(TokenType.PARENTHESIS)

    const args: ASTNode[] = []
    
    if (this.currentToken.value !== ')') {
      args.push(this.parseExpression())
      
      while (this.currentToken.value === ',') {
        this.advance()
        args.push(this.parseExpression())
      }
    }

    this.expect(TokenType.PARENTHESIS)
    
    return {
      type: 'Function',
      value: functionName,
      children: args
    }
  }
}

export class FormulaEvaluator {
  private cellData: { [key: string]: any } = {}

  constructor(cellData: { [key: string]: any } = {}) {
    this.cellData = cellData
  }

  evaluate(ast: ASTNode): any {
    switch (ast.type) {
      case 'Number':
        return ast.value
      case 'String':
        return ast.value
      case 'CellRef':
        return this.evaluateCellRef(ast.value as string)
      case 'BinaryOp':
        return this.evaluateBinaryOp(ast)
      case 'UnaryOp':
        return this.evaluateUnaryOp(ast)
      case 'Function':
        return this.evaluateFunction(ast)
      default:
        throw new Error(`Unknown AST node type: ${ast.type}`)
    }
  }

  private evaluateCellRef(cellRef: string): any {
    const cellPos = this.parseCellReference(cellRef)
    const key = `${cellPos.row},${cellPos.col}`
    return this.cellData[key]?.value || 0
  }

  private evaluateBinaryOp(ast: ASTNode): any {
    const left = this.evaluate(ast.children![0])
    const right = this.evaluate(ast.children![1])
    
    const leftNum = this.toNumber(left)
    const rightNum = this.toNumber(right)

    switch (ast.value) {
      case '+': return leftNum + rightNum
      case '-': return leftNum - rightNum
      case '*': return leftNum * rightNum
      case '/': 
        if (rightNum === 0) throw new Error('Division by zero')
        return leftNum / rightNum
      case '%': return leftNum % rightNum
      case '^': return Math.pow(leftNum, rightNum)
      default:
        throw new Error(`Unknown binary operator: ${ast.value}`)
    }
  }

  private evaluateUnaryOp(ast: ASTNode): any {
    const operand = this.evaluate(ast.children![0])
    
    switch (ast.value) {
      case '-': return -this.toNumber(operand)
      default:
        throw new Error(`Unknown unary operator: ${ast.value}`)
    }
  }

  private evaluateFunction(ast: ASTNode): any {
    const functionName = ast.value as string
    const args = ast.children!.map(child => this.evaluate(child))

    switch (functionName.toLowerCase()) {
      case 'sum':
        return args.reduce((sum, val) => sum + this.toNumber(val), 0)
      case 'average':
        const sum = args.reduce((sum, val) => sum + this.toNumber(val), 0)
        return sum / args.length
      case 'max':
        return Math.max(...args.map(val => this.toNumber(val)))
      case 'min':
        return Math.min(...args.map(val => this.toNumber(val)))
      case 'count':
        return args.length
      case 'if':
        if (args.length !== 3) throw new Error('IF function requires 3 arguments')
        return args[0] ? args[1] : args[2]
      case 'abs':
        if (args.length !== 1) throw new Error('ABS function requires 1 argument')
        return Math.abs(this.toNumber(args[0]))
      case 'round':
        if (args.length !== 2) throw new Error('ROUND function requires 2 arguments')
        return Math.round(this.toNumber(args[0]) * Math.pow(10, this.toNumber(args[1]))) / Math.pow(10, this.toNumber(args[1]))
      case 'sqrt':
        if (args.length !== 1) throw new Error('SQRT function requires 1 argument')
        return Math.sqrt(this.toNumber(args[0]))
      case 'power':
        if (args.length !== 2) throw new Error('POWER function requires 2 arguments')
        return Math.pow(this.toNumber(args[0]), this.toNumber(args[1]))
      default:
        throw new Error(`Unknown function: ${functionName}`)
    }
  }

  private toNumber(value: any): number {
    if (typeof value === 'number') return value
    if (typeof value === 'string') {
      const num = parseFloat(value)
      return isNaN(num) ? 0 : num
    }
    if (typeof value === 'boolean') return value ? 1 : 0
    return 0
  }

  private parseCellReference(cellRef: string): CellReference {
    const match = cellRef.match(/^([A-Z]+)(\d+)$/)
    if (!match) throw new Error(`Invalid cell reference: ${cellRef}`)
    
    const col = this.columnLetterToNumber(match[1])
    const row = parseInt(match[2]) - 1
    
    return { row, col }
  }

  private columnLetterToNumber(letters: string): number {
    let result = 0
    for (let i = 0; i < letters.length; i++) {
      result = result * 26 + (letters.charCodeAt(i) - 64)
    }
    return result - 1
  }
}

export class FormulaEngine {
  private dependencyGraph: Map<string, DependencyNode> = new Map()
  private cellData: { [key: string]: any } = {}

  constructor(cellData: { [key: string]: any } = {}) {
    this.cellData = cellData
  }

  calculate(formula: string, cellRef: string): any {
    try {
      const lexer = new FormulaLexer(formula)
      const tokens = lexer.tokenize()
      
      const parser = new FormulaParser(tokens)
      const ast = parser.parse()
      
      const evaluator = new FormulaEvaluator(this.cellData)
      const result = evaluator.evaluate(ast)
      
      this.updateDependencyGraph(cellRef, formula)
      
      return result
    } catch (error) {
      console.error('Formula calculation error:', error)
      return '#ERROR'
    }
  }

  updateCellData(cellRef: string, value: any, formula?: string) {
    this.cellData[cellRef] = { value, formula }
    
    if (formula) {
      this.updateDependencyGraph(cellRef, formula)
    }
    
    this.recalculateDependents(cellRef)
  }

  private updateDependencyGraph(cellRef: string, formula: string) {
    const dependencies = this.extractDependencies(formula)
    
    if (!this.dependencyGraph.has(cellRef)) {
      this.dependencyGraph.set(cellRef, {
        cellRef,
        dependencies: new Set(),
        dependents: new Set(),
        formula
      })
    }
    
    const node = this.dependencyGraph.get(cellRef)!
    node.dependencies.clear()
    
    dependencies.forEach(dep => {
      node.dependencies.add(dep)
      
      if (!this.dependencyGraph.has(dep)) {
        this.dependencyGraph.set(dep, {
          cellRef: dep,
          dependencies: new Set(),
          dependents: new Set()
        })
      }
      
      this.dependencyGraph.get(dep)!.dependents.add(cellRef)
    })
  }

  private extractDependencies(formula: string): string[] {
    const lexer = new FormulaLexer(formula)
    const tokens = lexer.tokenize()
    
    return tokens
      .filter(token => token.type === TokenType.CELL_REF)
      .map(token => token.value)
  }

  private recalculateDependents(cellRef: string) {
    const node = this.dependencyGraph.get(cellRef)
    if (!node) return
    
    const visited = new Set<string>()
    const stack = [cellRef]
    
    while (stack.length > 0) {
      const current = stack.pop()!
      if (visited.has(current)) continue
      
      visited.add(current)
      const currentNode = this.dependencyGraph.get(current)
      
      if (currentNode) {
        currentNode.dependents.forEach(dependent => {
          const depNode = this.dependencyGraph.get(dependent)
          if (depNode && depNode.formula) {
            const newValue = this.calculate(depNode.formula, dependent)
            this.cellData[dependent] = { 
              ...this.cellData[dependent],
              value: newValue 
            }
            stack.push(dependent)
          }
        })
      }
    }
  }

  checkCircularDependency(cellRef: string): boolean {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    
    return this.hasCycle(cellRef, visited, recursionStack)
  }

  private hasCycle(cellRef: string, visited: Set<string>, recursionStack: Set<string>): boolean {
    if (recursionStack.has(cellRef)) return true
    if (visited.has(cellRef)) return false
    
    visited.add(cellRef)
    recursionStack.add(cellRef)
    
    const node = this.dependencyGraph.get(cellRef)
    if (node) {
      for (const dependency of node.dependencies) {
        if (this.hasCycle(dependency, visited, recursionStack)) {
          return true
        }
      }
    }
    
    recursionStack.delete(cellRef)
    return false
  }
}