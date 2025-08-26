<template>
  <div id="app">
    <a-layout class="excel-layout">
      <a-layout-header class="excel-header">
        <div class="header-content">
          <div class="logo">
            <h2>在线Excel编辑器</h2>
          </div>
          
          <div class="toolbar">
            <a-button-group>
              <a-button 
                :disabled="!canUndo" 
                @click="undo"
                title="撤销 (Ctrl+Z)"
              >
                <a-icon type="undo" />
              </a-button>
              <a-button 
                :disabled="!canRedo" 
                @click="redo"
                title="重做 (Ctrl+Y)"
              >
                <a-icon type="redo" />
              </a-button>
            </a-button-group>
            
            <a-button-group class="ml-2">
              <a-button @click="copy" title="复制 (Ctrl+C)">
                <a-icon type="copy" />
              </a-button>
              <a-button @click="paste" title="粘贴 (Ctrl+V)">
                <a-icon type="snippets" />
              </a-button>
            </a-button-group>
            
            <a-button-group class="ml-2">
              <a-button @click="showFormatDialog = true" title="格式化">
                <a-icon type="format-painter" />
              </a-button>
            </a-button-group>
            
            <a-button-group class="ml-2">
              <a-button @click="$refs.fileInput.click()" title="导入文件">
                <a-icon type="upload" />
                导入
              </a-button>
              <a-button @click="showExportDialog = true" title="导出文件">
                <a-icon type="download" />
                导出
              </a-button>
            </a-button-group>
          </div>
        </div>
      </a-layout-header>
      
      <a-layout-content class="excel-content">
        <div class="formula-bar">
          <div class="cell-reference">
            {{ currentCellRef }}
          </div>
          <div class="formula-input">
            <a-input 
              v-model="formulaValue" 
              placeholder="输入公式或值"
              @pressEnter="applyFormula"
              @blur="applyFormula"
            />
          </div>
        </div>
        
        <div class="grid-wrapper">
          <ExcelGrid 
            :worksheet-data="activeWorksheet"
            @cellSelected="onCellSelected"
            ref="excelGrid"
          />
        </div>
      </a-layout-content>
      
      <a-layout-footer class="excel-footer">
        <a-tabs v-model="activeTabKey" type="editable-card" @edit="onTabEdit">
          <a-tab-pane
            v-for="(sheet, index) in worksheets"
            :key="index.toString()"
            :tab="sheet.name"
            :closable="worksheets.length > 1"
          >
          </a-tab-pane>
        </a-tabs>
      </a-layout-footer>
    </a-layout>
    
    <input
      ref="fileInput"
      type="file"
      accept=".csv,.json,.xlsx,.xls"
      @change="onFileImport"
      style="display: none"
    />
    
    <a-modal
      v-model="showFormatDialog"
      title="单元格格式"
      @ok="applyFormat"
      width="600px"
    >
      <CellFormatDialog 
        :current-style="currentCellStyle"
        @styleChange="onStyleChange"
        ref="formatDialog"
      />
    </a-modal>
    
    <a-modal
      v-model="showExportDialog"
      title="导出文件"
      @ok="exportFile"
      width="400px"
    >
      <a-form layout="vertical">
        <a-form-item label="文件格式">
          <a-radio-group v-model="exportFormat">
            <a-radio value="csv">CSV</a-radio>
            <a-radio value="json">JSON</a-radio>
            <a-radio value="txt">TXT</a-radio>
          </a-radio-group>
        </a-form-item>
        
        <a-form-item>
          <a-checkbox v-model="includeFormulas">包含公式</a-checkbox>
        </a-form-item>
        
        <a-form-item>
          <a-checkbox v-model="includeStyles">包含样式</a-checkbox>
        </a-form-item>
        
        <a-form-item label="文件名">
          <a-input v-model="exportFileName" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script lang="ts">
import { mapState, mapGetters, mapActions } from 'vuex'
import ExcelGrid from '@/components/ExcelGrid.vue'
import CellFormatDialog from '@/components/CellFormatDialog.vue'
import { ImportExportManager } from '@/utils/ImportExport'
import { CellPosition, CellStyle } from '@/types'

export default {
  name: 'App',
  components: {
    ExcelGrid,
    CellFormatDialog
  },
  data() {
    return {
      showFormatDialog: false,
      showExportDialog: false,
      formulaValue: '',
      currentCell: null as CellPosition | null,
      currentCellStyle: {} as CellStyle,
      activeTabKey: '0',
      exportFormat: 'csv',
      includeFormulas: false,
      includeStyles: false,
      exportFileName: '工作表'
    }
  },
  computed: {
    ...mapState(['worksheets', 'selectedCells']),
    ...mapGetters(['activeWorksheet', 'canUndo', 'canRedo']),
    currentCellRef(): string {
      if (!this.currentCell) return 'A1'
      
      const colLetter = this.numberToColumnLetter(this.currentCell.col)
      return `${colLetter}${this.currentCell.row + 1}`
    }
  },
  created() {
    this.setupKeyboardShortcuts()
  },
  methods: {
    ...mapActions(['copySelectedCells', 'pasteToSelectedCells', 'undo', 'redo']),
    
    setupKeyboardShortcuts() {
      document.addEventListener('keydown', (event: KeyboardEvent) => {
        if (event.ctrlKey || event.metaKey) {
          switch (event.key.toLowerCase()) {
            case 'z':
              if (event.shiftKey) {
                this.redo()
              } else {
                this.undo()
              }
              event.preventDefault()
              break
            case 'y':
              this.redo()
              event.preventDefault()
              break
            case 'c':
              this.copy()
              event.preventDefault()
              break
            case 'v':
              this.paste()
              event.preventDefault()
              break
            case 's':
              this.saveWorksheet()
              event.preventDefault()
              break
          }
        }
        
        if (event.key === 'Delete' || event.key === 'Backspace') {
          this.deleteSelectedCells()
          event.preventDefault()
        }
      })
    },

    onCellSelected(cell: CellPosition) {
      this.currentCell = cell
      this.$store.commit('SET_SELECTED_CELLS', [cell])
      
      const cellData = this.$store.getters.getCellData(cell.row, cell.col)
      this.formulaValue = cellData?.formula || cellData?.value?.toString() || ''
      this.currentCellStyle = cellData?.style || {}
    },

    applyFormula() {
      if (!this.currentCell || !this.formulaValue.trim()) return
      
      const data = {
        value: this.formulaValue,
        type: this.detectValueType(this.formulaValue),
        style: this.currentCellStyle
      }
      
      if (this.formulaValue.startsWith('=')) {
        data.value = this.calculateFormula(this.formulaValue)
      }
      
      this.$store.dispatch('updateCell', {
        row: this.currentCell.row,
        col: this.currentCell.col,
        data
      })
    },

    copy() {
      this.copySelectedCells()
    },

    paste() {
      this.pasteToSelectedCells()
    },

    deleteSelectedCells() {
      const selectedCells = this.$store.state.selectedCells
      selectedCells.forEach((cell: CellPosition) => {
        this.$store.dispatch('deleteCell', cell)
      })
    },

    saveWorksheet() {
      console.log('保存工作表')
    },

    onTabEdit(targetKey: string, action: string) {
      if (action === 'add') {
        this.addWorksheet()
      } else if (action === 'remove') {
        this.removeWorksheet(parseInt(targetKey))
      }
    },

    addWorksheet() {
      const newIndex = this.worksheets.length + 1
      this.$store.commit('ADD_WORKSHEET', {
        name: `Sheet${newIndex}`,
        rows: 1000000,
        cols: 16384,
        cells: {}
      })
      this.activeTabKey = (this.worksheets.length - 1).toString()
      this.$store.commit('SET_ACTIVE_WORKSHEET', this.worksheets.length - 1)
    },

    removeWorksheet(index: number) {
      this.$store.commit('REMOVE_WORKSHEET', index)
      if (parseInt(this.activeTabKey) === index) {
        this.activeTabKey = '0'
        this.$store.commit('SET_ACTIVE_WORKSHEET', 0)
      }
    },

    onStyleChange(style: CellStyle) {
      this.currentCellStyle = { ...this.currentCellStyle, ...style }
    },

    applyFormat() {
      if (!this.currentCell) return
      
      const cellData = this.$store.getters.getCellData(this.currentCell.row, this.currentCell.col) || {
        value: '',
        type: 'text' as const
      }
      
      this.$store.dispatch('updateCell', {
        row: this.currentCell.row,
        col: this.currentCell.col,
        data: {
          ...cellData,
          style: this.currentCellStyle
        }
      })
      
      this.showFormatDialog = false
    },

    numberToColumnLetter(num: number): string {
      let result = ''
      while (num >= 0) {
        result = String.fromCharCode(65 + (num % 26)) + result
        num = Math.floor(num / 26) - 1
      }
      return result
    },

    detectValueType(value: string): 'text' | 'number' | 'boolean' | 'date' {
      if (value === 'true' || value === 'false') return 'boolean'
      if (!isNaN(Number(value)) && value.trim() !== '') return 'number'
      if (Date.parse(value)) return 'date'
      return 'text'
    },

    calculateFormula(formula: string): any {
      try {
        return formula
      } catch (error) {
        return '#ERROR'
      }
    },

    async onFileImport(event: Event) {
      const target = event.target as HTMLInputElement
      const file = target.files?.[0]
      
      if (!file) return
      
      try {
        let worksheet
        const extension = file.name.split('.').pop()?.toLowerCase()
        
        switch (extension) {
          case 'csv':
            worksheet = await ImportExportManager.importFromCSV(file)
            break
          case 'json':
            worksheet = await ImportExportManager.importFromJSON(file)
            break
          case 'xlsx':
          case 'xls':
            try {
              worksheet = await ImportExportManager.importFromExcel(file)
            } catch (error) {
              this.$message.warning('Excel文件导入需要额外的库支持，当前版本暂不支持')
              return
            }
            break
          default:
            this.$message.error('不支持的文件格式')
            return
        }
        
        this.$store.commit('ADD_WORKSHEET', worksheet)
        this.activeTabKey = (this.worksheets.length - 1).toString()
        this.$store.commit('SET_ACTIVE_WORKSHEET', this.worksheets.length - 1)
        
        this.$message.success('文件导入成功')
      } catch (error) {
        console.error('Import error:', error)
        this.$message.error('文件导入失败: ' + error.message)
      } finally {
        target.value = ''
      }
    },

    exportFile() {
      const worksheet = this.activeWorksheet
      if (!worksheet) {
        this.$message.error('没有可导出的工作表')
        return
      }

      try {
        let content = ''
        const options = {
          format: this.exportFormat as any,
          includeFormulas: this.includeFormulas,
          includeStyles: this.includeStyles
        }

        switch (this.exportFormat) {
          case 'csv':
            content = ImportExportManager.exportToCSV(worksheet, options)
            break
          case 'json':
            content = ImportExportManager.exportToJSON(worksheet, options)
            break
          case 'txt':
            content = ImportExportManager.exportToTXT(worksheet, options)
            break
          default:
            this.$message.error('不支持的导出格式')
            return
        }

        const filename = this.exportFileName + ImportExportManager.getFileExtension(this.exportFormat)
        const mimeType = ImportExportManager.getMimeType(this.exportFormat)
        
        ImportExportManager.downloadFile(content, filename, mimeType)
        
        this.showExportDialog = false
        this.$message.success('文件导出成功')
      } catch (error) {
        console.error('Export error:', error)
        this.$message.error('文件导出失败: ' + error.message)
      }
    }
  }
}
</script>

<style>
#app {
  height: 100vh;
  font-family: Arial, sans-serif;
}

.excel-layout {
  height: 100%;
}

.excel-header {
  background: #fff;
  padding: 0 16px;
  border-bottom: 1px solid #e8e8e8;
  height: 64px;
  line-height: 64px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 100%;
}

.logo h2 {
  margin: 0;
  color: #1890ff;
}

.toolbar .ml-2 {
  margin-left: 8px;
}

.excel-content {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px - 50px);
}

.formula-bar {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  border-bottom: 1px solid #e8e8e8;
  background: #fafafa;
}

.cell-reference {
  width: 80px;
  padding: 4px 8px;
  border: 1px solid #d9d9d9;
  background: white;
  text-align: center;
  font-weight: bold;
  margin-right: 8px;
}

.formula-input {
  flex: 1;
}

.grid-wrapper {
  flex: 1;
  position: relative;
}

.excel-footer {
  height: 50px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
  padding: 0 16px;
}
</style>