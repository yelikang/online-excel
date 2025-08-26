<template>
  <div class="custom-scrollbar" :class="{ horizontal: isHorizontal, vertical: !isHorizontal }">
    <div
      class="scrollbar-track"
      @mousedown="onTrackMouseDown"
      ref="track"
    >
      <div
        class="scrollbar-thumb"
        :style="thumbStyle"
        @mousedown="onThumbMouseDown"
        ref="thumb"
      ></div>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  name: 'CustomScrollbar',
  props: {
    isHorizontal: {
      type: Boolean,
      default: false
    },
    scrollPosition: {
      type: Number,
      default: 0
    },
    contentSize: {
      type: Number,
      default: 1000
    },
    viewportSize: {
      type: Number,
      default: 300
    },
    thumbSize: {
      type: Number,
      default: 12
    }
  },
  data() {
    return {
      isDragging: false,
      dragStartPosition: 0,
      dragStartScroll: 0
    }
  },
  computed: {
    thumbStyle() {
      const ratio = this.viewportSize / this.contentSize
      const thumbLength = Math.max(20, this.viewportSize * ratio)
      const maxThumbPosition = this.viewportSize - thumbLength
      const thumbPosition = (this.scrollPosition / (this.contentSize - this.viewportSize)) * maxThumbPosition

      if (this.isHorizontal) {
        return {
          width: `${thumbLength}px`,
          left: `${thumbPosition}px`,
          height: `${this.thumbSize}px`
        }
      } else {
        return {
          height: `${thumbLength}px`,
          top: `${thumbPosition}px`,
          width: `${this.thumbSize}px`
        }
      }
    }
  },
  destroyed() {
    document.removeEventListener('mousemove', this.onMouseMove)
    document.removeEventListener('mouseup', this.onMouseUp)
  },
  methods: {
    emitScroll(position: number) {
      this.$emit('scroll', position)
    },

    onThumbMouseDown(event: MouseEvent) {
      event.preventDefault()
      this.isDragging = true
      this.dragStartPosition = this.isHorizontal ? event.clientX : event.clientY
      this.dragStartScroll = this.scrollPosition

      document.addEventListener('mousemove', this.onMouseMove)
      document.addEventListener('mouseup', this.onMouseUp)
    },

    onTrackMouseDown(event: MouseEvent) {
      if (event.target === this.$refs.thumb) return

      const trackRect = (this.$refs.track as HTMLElement).getBoundingClientRect()
      const clickPosition = this.isHorizontal 
        ? event.clientX - trackRect.left 
        : event.clientY - trackRect.top
      
      const thumbRect = (this.$refs.thumb as HTMLElement).getBoundingClientRect()
      const thumbCenter = this.isHorizontal 
        ? thumbRect.width / 2 
        : thumbRect.height / 2

      const newThumbPosition = clickPosition - thumbCenter
      const maxThumbPosition = (this.isHorizontal ? trackRect.width : trackRect.height) - 
                               (this.isHorizontal ? thumbRect.width : thumbRect.height)
      
      const ratio = newThumbPosition / maxThumbPosition
      const newScrollPosition = ratio * (this.contentSize - this.viewportSize)
      
      this.emitScroll(Math.max(0, Math.min(newScrollPosition, this.contentSize - this.viewportSize)))
    },

    onMouseMove(event: MouseEvent) {
      if (!this.isDragging) return

      const currentPosition = this.isHorizontal ? event.clientX : event.clientY
      const delta = currentPosition - this.dragStartPosition
      
      const trackSize = this.isHorizontal 
        ? (this.$refs.track as HTMLElement).clientWidth
        : (this.$refs.track as HTMLElement).clientHeight
      
      const thumbLength = this.isHorizontal 
        ? (this.$refs.thumb as HTMLElement).clientWidth
        : (this.$refs.thumb as HTMLElement).clientHeight

      const maxThumbPosition = trackSize - thumbLength
      const scrollRatio = delta / maxThumbPosition
      const scrollDelta = scrollRatio * (this.contentSize - this.viewportSize)
      
      const newScrollPosition = this.dragStartScroll + scrollDelta
      this.emitScroll(Math.max(0, Math.min(newScrollPosition, this.contentSize - this.viewportSize)))
    },

    onMouseUp() {
      this.isDragging = false
      document.removeEventListener('mousemove', this.onMouseMove)
      document.removeEventListener('mouseup', this.onMouseUp)
    }
  }
}
</script>

<style scoped>
.custom-scrollbar {
  position: absolute;
  background-color: #f5f5f5;
  border: 1px solid #d9d9d9;
  z-index: 10;
}

.custom-scrollbar.horizontal {
  height: 16px;
  bottom: 0;
  left: 0;
  right: 16px;
}

.custom-scrollbar.vertical {
  width: 16px;
  top: 0;
  right: 0;
  bottom: 16px;
}

.scrollbar-track {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
}

.scrollbar-thumb {
  position: absolute;
  background-color: #bfbfbf;
  border-radius: 4px;
  cursor: grab;
  transition: background-color 0.2s;
}

.scrollbar-thumb:hover {
  background-color: #999;
}

.scrollbar-thumb:active {
  cursor: grabbing;
  background-color: #666;
}
</style>