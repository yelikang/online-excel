<template>
  <div class="cell-format-dialog">
    <a-tabs default-active-key="font">
      <a-tab-pane key="font" tab="字体">
        <a-form layout="horizontal" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <a-form-item label="字体">
            <a-select v-model="localStyle.fontFamily" @change="emitChange">
              <a-select-option value="Arial">Arial</a-select-option>
              <a-select-option value="Microsoft YaHei">微软雅黑</a-select-option>
              <a-select-option value="SimSun">宋体</a-select-option>
              <a-select-option value="SimHei">黑体</a-select-option>
            </a-select>
          </a-form-item>
          
          <a-form-item label="字号">
            <a-input-number 
              v-model="localStyle.fontSize" 
              :min="8" 
              :max="72" 
              @change="emitChange"
            />
          </a-form-item>
          
          <a-form-item label="字体颜色">
            <input 
              type="color" 
              v-model="localStyle.color" 
              @change="emitChange"
              style="width: 50px; height: 30px;"
            />
          </a-form-item>
          
          <a-form-item label="样式">
            <a-checkbox-group @change="onFontStyleChange">
              <a-checkbox :checked="localStyle.fontWeight === 'bold'" value="bold">
                粗体
              </a-checkbox>
              <a-checkbox :checked="localStyle.fontStyle === 'italic'" value="italic">
                斜体
              </a-checkbox>
            </a-checkbox-group>
          </a-form-item>
        </a-form>
      </a-tab-pane>
      
      <a-tab-pane key="alignment" tab="对齐">
        <a-form layout="horizontal" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <a-form-item label="水平对齐">
            <a-radio-group v-model="localStyle.textAlign" @change="emitChange">
              <a-radio value="left">左对齐</a-radio>
              <a-radio value="center">居中</a-radio>
              <a-radio value="right">右对齐</a-radio>
            </a-radio-group>
          </a-form-item>
          
          <a-form-item label="垂直对齐">
            <a-radio-group v-model="localStyle.verticalAlign" @change="emitChange">
              <a-radio value="top">顶部对齐</a-radio>
              <a-radio value="middle">居中对齐</a-radio>
              <a-radio value="bottom">底部对齐</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-form>
      </a-tab-pane>
      
      <a-tab-pane key="fill" tab="填充">
        <a-form layout="horizontal" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <a-form-item label="背景色">
            <input 
              type="color" 
              v-model="localStyle.backgroundColor" 
              @change="emitChange"
              style="width: 50px; height: 30px;"
            />
          </a-form-item>
        </a-form>
      </a-tab-pane>
      
      <a-tab-pane key="border" tab="边框">
        <a-form layout="horizontal" :label-col="{ span: 6 }" :wrapper-col="{ span: 18 }">
          <a-form-item label="边框样式">
            <a-select v-model="borderStyle" @change="onBorderStyleChange">
              <a-select-option value="">无边框</a-select-option>
              <a-select-option value="1px solid #000000">细实线</a-select-option>
              <a-select-option value="2px solid #000000">粗实线</a-select-option>
              <a-select-option value="1px dashed #000000">虚线</a-select-option>
            </a-select>
          </a-form-item>
          
          <a-form-item label="边框颜色">
            <input 
              type="color" 
              v-model="borderColor" 
              @change="onBorderColorChange"
              style="width: 50px; height: 30px;"
            />
          </a-form-item>
          
          <a-form-item label="边框位置">
            <a-checkbox-group v-model="borderPositions" @change="onBorderPositionChange">
              <a-checkbox value="top">上边框</a-checkbox>
              <a-checkbox value="right">右边框</a-checkbox>
              <a-checkbox value="bottom">下边框</a-checkbox>
              <a-checkbox value="left">左边框</a-checkbox>
            </a-checkbox-group>
          </a-form-item>
        </a-form>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts">
import { CellStyle } from '@/types'

export default {
  name: 'CellFormatDialog',
  props: {
    currentStyle: {
      type: Object as () => CellStyle,
      default: () => ({})
    }
  },
  data() {
    return {
      localStyle: {} as CellStyle,
      borderStyle: '',
      borderColor: '#000000',
      borderPositions: [] as string[]
    }
  },
  created() {
    this.localStyle = { 
      fontSize: 12,
      fontFamily: 'Arial',
      color: '#000000',
      backgroundColor: '#ffffff',
      textAlign: 'left',
      verticalAlign: 'middle',
      fontWeight: 'normal',
      fontStyle: 'normal',
      ...this.currentStyle 
    }
    
    this.initBorderValues()
  },
  watch: {
    currentStyle: {
      handler() {
        this.localStyle = { ...this.localStyle, ...this.currentStyle }
        this.initBorderValues()
      },
      deep: true
    }
  },
  methods: {
    initBorderValues() {
      if (this.localStyle.border) {
        const border = this.localStyle.border
        if (border.top) {
          this.borderStyle = border.top
          this.borderPositions.push('top')
        }
        if (border.right) {
          if (!this.borderStyle) this.borderStyle = border.right
          this.borderPositions.push('right')
        }
        if (border.bottom) {
          if (!this.borderStyle) this.borderStyle = border.bottom
          this.borderPositions.push('bottom')
        }
        if (border.left) {
          if (!this.borderStyle) this.borderStyle = border.left
          this.borderPositions.push('left')
        }
      }
    },

    emitChange() {
      this.$emit('styleChange', { ...this.localStyle })
    },

    onFontStyleChange(checkedValues: string[]) {
      this.localStyle.fontWeight = checkedValues.includes('bold') ? 'bold' : 'normal'
      this.localStyle.fontStyle = checkedValues.includes('italic') ? 'italic' : 'normal'
      this.emitChange()
    },

    onBorderStyleChange() {
      this.updateBorders()
    },

    onBorderColorChange() {
      if (this.borderStyle && this.borderStyle !== '') {
        const parts = this.borderStyle.split(' ')
        if (parts.length >= 2) {
          this.borderStyle = `${parts[0]} ${parts[1]} ${this.borderColor}`
          this.updateBorders()
        }
      }
    },

    onBorderPositionChange() {
      this.updateBorders()
    },

    updateBorders() {
      if (!this.localStyle.border) {
        this.localStyle.border = {}
      }

      const border = this.localStyle.border
      
      border.top = this.borderPositions.includes('top') ? this.borderStyle : undefined
      border.right = this.borderPositions.includes('right') ? this.borderStyle : undefined
      border.bottom = this.borderPositions.includes('bottom') ? this.borderStyle : undefined
      border.left = this.borderPositions.includes('left') ? this.borderStyle : undefined

      if (!border.top && !border.right && !border.bottom && !border.left) {
        delete this.localStyle.border
      }

      this.emitChange()
    }
  }
}
</script>

<style scoped>
.cell-format-dialog {
  padding: 16px;
}
</style>