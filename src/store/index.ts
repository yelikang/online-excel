import Vue from 'vue'
import Vuex from 'vuex'
import { WorksheetData, CellData, CellPosition } from '@/types'

Vue.use(Vuex)

interface RootState {
  worksheets: WorksheetData[]
  activeWorksheetIndex: number
  selectedCells: CellPosition[]
  clipboard: CellData[]
  history: HistoryEntry[]
  historyIndex: number
}

interface HistoryEntry {
  action: 'edit' | 'delete' | 'insert'
  data: any
  timestamp: number
}

export default new Vuex.Store<RootState>({
  state: {
    worksheets: [
      {
        name: 'Sheet1',
        rows: 100,
        cols: 100,
        cells: {}
      }
    ],
    activeWorksheetIndex: 0,
    selectedCells: [],
    clipboard: [],
    history: [],
    historyIndex: -1
  },

  mutations: {
    SET_CELL_DATA(state, { worksheetIndex, row, col, data }: {
      worksheetIndex: number,
      row: number,
      col: number,
      data: CellData
    }) {
      const worksheet = state.worksheets[worksheetIndex]
      if (worksheet) {
        const key = `${row},${col}`
        Vue.set(worksheet.cells, key, data)
      }
    },

    DELETE_CELL_DATA(state, { worksheetIndex, row, col }: {
      worksheetIndex: number,
      row: number,
      col: number
    }) {
      const worksheet = state.worksheets[worksheetIndex]
      if (worksheet) {
        const key = `${row},${col}`
        Vue.delete(worksheet.cells, key)
      }
    },

    SET_SELECTED_CELLS(state, cells: CellPosition[]) {
      state.selectedCells = cells
    },

    SET_ACTIVE_WORKSHEET(state, index: number) {
      if (index >= 0 && index < state.worksheets.length) {
        state.activeWorksheetIndex = index
      }
    },

    ADD_WORKSHEET(state, worksheet: WorksheetData) {
      state.worksheets.push(worksheet)
    },

    REMOVE_WORKSHEET(state, index: number) {
      if (state.worksheets.length > 1 && index >= 0 && index < state.worksheets.length) {
        state.worksheets.splice(index, 1)
        if (state.activeWorksheetIndex >= state.worksheets.length) {
          state.activeWorksheetIndex = state.worksheets.length - 1
        }
      }
    },

    SET_CLIPBOARD(state, data: CellData[]) {
      state.clipboard = data
    },

    ADD_HISTORY_ENTRY(state, entry: HistoryEntry) {
      state.history = state.history.slice(0, state.historyIndex + 1)
      state.history.push(entry)
      state.historyIndex = state.history.length - 1
      
      if (state.history.length > 100) {
        state.history.shift()
        state.historyIndex--
      }
    },

    UNDO(state) {
      if (state.historyIndex >= 0) {
        state.historyIndex--
      }
    },

    REDO(state) {
      if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++
      }
    }
  },

  actions: {
    updateCell({ commit, state }, { row, col, data }: {
      row: number,
      col: number,
      data: CellData
    }) {
      const oldData = state.worksheets[state.activeWorksheetIndex].cells[`${row},${col}`]
      
      commit('ADD_HISTORY_ENTRY', {
        action: 'edit',
        data: { row, col, oldData, newData: data },
        timestamp: Date.now()
      })
      
      commit('SET_CELL_DATA', {
        worksheetIndex: state.activeWorksheetIndex,
        row,
        col,
        data
      })
    },

    deleteCell({ commit, state }, { row, col }: { row: number, col: number }) {
      const oldData = state.worksheets[state.activeWorksheetIndex].cells[`${row},${col}`]
      
      if (oldData) {
        commit('ADD_HISTORY_ENTRY', {
          action: 'delete',
          data: { row, col, oldData },
          timestamp: Date.now()
        })
        
        commit('DELETE_CELL_DATA', {
          worksheetIndex: state.activeWorksheetIndex,
          row,
          col
        })
      }
    },

    copySelectedCells({ commit, state }) {
      const worksheet = state.worksheets[state.activeWorksheetIndex]
      const clipboardData = state.selectedCells.map(cell => {
        const key = `${cell.row},${cell.col}`
        return worksheet.cells[key] || { value: '', type: 'text' as const }
      })
      
      commit('SET_CLIPBOARD', clipboardData)
    },

    pasteToSelectedCells({ commit, state }) {
      if (state.clipboard.length === 0 || state.selectedCells.length === 0) return
      
      const startCell = state.selectedCells[0]
      state.clipboard.forEach((data, index) => {
        const row = startCell.row + Math.floor(index / 1)
        const col = startCell.col + (index % 1)
        
        commit('SET_CELL_DATA', {
          worksheetIndex: state.activeWorksheetIndex,
          row,
          col,
          data: { ...data }
        })
      })
    },

    undo({ commit, state, dispatch }) {
      if (state.historyIndex >= 0) {
        const entry = state.history[state.historyIndex]
        
        switch (entry.action) {
          case 'edit':
            const { row, col, oldData } = entry.data
            if (oldData) {
              commit('SET_CELL_DATA', {
                worksheetIndex: state.activeWorksheetIndex,
                row,
                col,
                data: oldData
              })
            } else {
              commit('DELETE_CELL_DATA', {
                worksheetIndex: state.activeWorksheetIndex,
                row,
                col
              })
            }
            break
          case 'delete':
            commit('SET_CELL_DATA', {
              worksheetIndex: state.activeWorksheetIndex,
              row: entry.data.row,
              col: entry.data.col,
              data: entry.data.oldData
            })
            break
        }
        
        commit('UNDO')
      }
    },

    redo({ commit, state }) {
      if (state.historyIndex < state.history.length - 1) {
        commit('REDO')
        const entry = state.history[state.historyIndex]
        
        switch (entry.action) {
          case 'edit':
            commit('SET_CELL_DATA', {
              worksheetIndex: state.activeWorksheetIndex,
              row: entry.data.row,
              col: entry.data.col,
              data: entry.data.newData
            })
            break
          case 'delete':
            commit('DELETE_CELL_DATA', {
              worksheetIndex: state.activeWorksheetIndex,
              row: entry.data.row,
              col: entry.data.col
            })
            break
        }
      }
    }
  },

  getters: {
    activeWorksheet: (state) => state.worksheets[state.activeWorksheetIndex],
    canUndo: (state) => state.historyIndex >= 0,
    canRedo: (state) => state.historyIndex < state.history.length - 1,
    
    getCellData: (state) => (row: number, col: number) => {
      const worksheet = state.worksheets[state.activeWorksheetIndex]
      const key = `${row},${col}`
      return worksheet.cells[key] || null
    }
  }
})