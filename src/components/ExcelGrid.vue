<template>
  <div class="excel-grid" @wheel="onWheel" @mousedown="onMouseDown">
    <div 
      class="grid-container" 
      ref="container"
      @click="onClick"
      @dblclick="onDoubleClick"
    ></div>
    
    <CustomScrollbar
      :is-horizontal="true"
      :scroll-position="scrollLeft"
      :content-size="totalWidth"
      :viewport-size="viewportWidth"
      @scroll="onHorizontalScroll"
    />
    
    <CustomScrollbar
      :is-horizontal="false"
      :scroll-position="scrollTop"
      :content-size="totalHeight"
      :viewport-size="viewportHeight"
      @scroll="onVerticalScroll"
    />

    <div 
      v-if="isEditing" 
      class="cell-editor"
      :style="editorStyle"
      ref="editor"
    >
      <input
        v-model="editValue"
        @blur="finishEdit"
        @keydown="onEditorKeyDown"
        ref="input"
        type="text"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { VirtualScrollManager } from '@/utils/VirtualScroll'
import { CanvasRenderer } from '@/utils/CanvasRenderer'
import { FormulaEngine } from '@/utils/FormulaEngine'
import CustomScrollbar from './CustomScrollbar.vue'
import { 
  WorksheetData, 
  CellData, 
  CellPosition, 
  VirtualScrollConfig,
  RenderRange 
} from '@/types'

export default {
  name: 'ExcelGrid',
  components: {
    CustomScrollbar
  },
  props: {
    worksheetData: {
      type: Object as () => WorksheetData,
      required: true
    }
  },
  data() {
    return {
      virtualScroll: null as VirtualScrollManager | null,
      canvasRenderer: null as CanvasRenderer | null,
      formulaEngine: null as FormulaEngine | null,
      scrollTop: 0,
      scrollLeft: 0,
      selectedCells: [] as CellPosition[],
      isEditing: false,
      editValue: '',
      editingCell: null as CellPosition | null,
      viewportWidth: 0,
      viewportHeight: 0,
      cellWidth: 100,
      cellHeight: 25,
      bufferSize: 10
    }
  },
  computed: {
    totalWidth(): number {
      return this.worksheetData.cols * this.cellWidth
    },
    totalHeight(): number {
      return this.worksheetData.rows * this.cellHeight
    },
    editorStyle(): object {
      if (!this.editingCell || !this.canvasRenderer) return {}
      
      const bounds = this.canvasRenderer.getCellBounds(
        this.editingCell.row,
        this.editingCell.col,
        this.scrollLeft,
        this.scrollTop
      )
      
      return {
        left: `${bounds.x}px`,
        top: `${bounds.y}px`,
        width: `${bounds.width - 1}px`,
        height: `${bounds.height - 1}px`
      }
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.initializeComponents()
      this.setupResizeObserver()
      this.render()
    })
  },
  beforeDestroy() {
    if (this.canvasRenderer) {
      this.canvasRenderer.destroy()
    }
  },
  watch: {
    worksheetData: {
      handler() {
        this.render()
      },
      deep: true
    }
  },
  methods: {
    initializeComponents() {
      const container = this.$refs.container as HTMLElement
      const rect = container.getBoundingClientRect()
      
      this.viewportWidth = rect.width
      this.viewportHeight = rect.height

      const config: VirtualScrollConfig = {
        itemHeight: this.cellHeight,
        itemWidth: this.cellWidth,
        viewportHeight: this.viewportHeight,
        viewportWidth: this.viewportWidth,
        totalRows: this.worksheetData.rows,
        totalCols: this.worksheetData.cols,
        bufferSize: this.bufferSize
      }

      this.virtualScroll = new VirtualScrollManager(config)
      this.canvasRenderer = new CanvasRenderer(container, this.cellWidth, this.cellHeight)
      this.formulaEngine = new FormulaEngine(this.worksheetData.cells)

      this.virtualScroll.onRangeChange(this.onRenderRangeChange)
    },

    setupResizeObserver() {
      const resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect
          this.viewportWidth = width
          this.viewportHeight = height
          
          if (this.canvasRenderer) {
            this.canvasRenderer.resize(width, height)
          }
          if (this.virtualScroll) {
            this.virtualScroll.updateConfig({
              viewportWidth: width,
              viewportHeight: height
            })
          }
          this.render()
        }
      })
      
      resizeObserver.observe(this.$refs.container as HTMLElement)
      
      this.$once('hook:beforeDestroy', () => {
        resizeObserver.disconnect()
      })
    },

    onRenderRangeChange(range: RenderRange) {
      this.render()
    },

    render() {
      if (!this.virtualScroll || !this.canvasRenderer) {
        return
      }
      
      const range = this.virtualScroll.getRenderRange()
      
      this.canvasRenderer.renderGrid(range, this.scrollLeft, this.scrollTop)
      this.canvasRenderer.renderRange(range, this.getCellData, this.scrollLeft, this.scrollTop)
      
      if (this.selectedCells.length > 0) {
        this.canvasRenderer.renderSelection(this.selectedCells, this.scrollLeft, this.scrollTop)
      }
    },

    getCellData(row: number, col: number): CellData | null {
      const key = `${row},${col}`
      return this.worksheetData.cells[key] || null
    },

    setCellData(row: number, col: number, data: CellData) {
      const key = `${row},${col}`
      this.$set(this.worksheetData.cells, key, data)
      this.render()
    },

    onWheel(event: WheelEvent) {
      event.preventDefault()
      
      const deltaY = event.deltaY
      const deltaX = event.deltaX
      
      const newScrollTop = Math.max(0, Math.min(
        this.scrollTop + deltaY,
        this.totalHeight - this.viewportHeight
      ))
      
      const newScrollLeft = Math.max(0, Math.min(
        this.scrollLeft + deltaX,
        this.totalWidth - this.viewportWidth
      ))
      
      this.setScrollPosition(newScrollTop, newScrollLeft)
    },

    onVerticalScroll(scrollTop: number) {
      this.setScrollPosition(scrollTop, this.scrollLeft)
    },

    onHorizontalScroll(scrollLeft: number) {
      this.setScrollPosition(this.scrollTop, scrollLeft)
    },

    setScrollPosition(scrollTop: number, scrollLeft: number) {
      this.scrollTop = scrollTop
      this.scrollLeft = scrollLeft
      if (this.virtualScroll) {
        this.virtualScroll.setScrollPosition(scrollTop, scrollLeft)
      }
    },

    onClick(event: MouseEvent) {
      if (this.isEditing) return
      
      if (!this.canvasRenderer) return
      
      const cell = this.canvasRenderer.getCellFromCoordinates(
        event.offsetX,
        event.offsetY,
        this.scrollLeft,
        this.scrollTop
      )
      
      this.selectedCells = [cell]
      this.render()
      
      this.$emit('cellSelected', cell)
    },

    onDoubleClick(event: MouseEvent) {
      if (!this.canvasRenderer) return
      
      const cell = this.canvasRenderer.getCellFromCoordinates(
        event.offsetX,
        event.offsetY,
        this.scrollLeft,
        this.scrollTop
      )
      
      this.startEdit(cell)
    },

    onMouseDown(event: MouseEvent) {
      if (this.isEditing) {
        this.finishEdit()
      }
    },

    startEdit(cell: CellPosition) {
      this.isEditing = true
      this.editingCell = cell
      
      const cellData = this.getCellData(cell.row, cell.col)
      this.editValue = cellData?.formula || cellData?.value?.toString() || ''
      
      this.$nextTick(() => {
        const input = this.$refs.input as HTMLInputElement
        if (input) {
          input.focus()
          input.select()
        }
      })
    },

    finishEdit() {
      if (!this.isEditing || !this.editingCell) return
      
      const newData: CellData = {
        value: this.editValue,
        type: this.detectValueType(this.editValue)
      }
      
      if (this.editValue.startsWith('=')) {
        newData.formula = this.editValue
        newData.value = this.calculateFormula(this.editValue)
      }
      
      this.setCellData(this.editingCell.row, this.editingCell.col, newData)
      
      this.isEditing = false
      this.editingCell = null
      this.editValue = ''
    },

    onEditorKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case 'Enter':
          this.finishEdit()
          break
        case 'Escape':
          this.isEditing = false
          this.editingCell = null
          this.editValue = ''
          break
      }
    },

    detectValueType(value: string): 'text' | 'number' | 'boolean' | 'date' {
      if (value === 'true' || value === 'false') return 'boolean'
      if (!isNaN(Number(value)) && value.trim() !== '') return 'number'
      if (Date.parse(value)) return 'date'
      return 'text'
    },

    calculateFormula(formula: string): any {
      if (!this.editingCell || !this.formulaEngine) return '#ERROR'
      
      const cellRef = `${this.editingCell.row},${this.editingCell.col}`
      return this.formulaEngine.calculate(formula, cellRef)
    }
  }
}
</script>

<style scoped>
.excel-grid {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border: 1px solid #d9d9d9;
}

.grid-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 16px;
  bottom: 16px;
  cursor: cell;
}

.cell-editor {
  position: absolute;
  z-index: 20;
  border: 2px solid #1890ff;
}

.cell-editor input {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  padding: 2px 4px;
  font-size: 12px;
  font-family: Arial, sans-serif;
  background: white;
}
</style>