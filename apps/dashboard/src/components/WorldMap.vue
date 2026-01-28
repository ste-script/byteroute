<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, shallowRef } from 'vue'
import maplibregl from 'maplibre-gl'
import { Deck } from '@deck.gl/core'
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers'
import type { TrafficFlow, MapViewState } from '@/types'

interface Props {
  flows?: TrafficFlow[]
  viewState?: Partial<MapViewState>
  darkMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  flows: () => [],
  darkMode: false
})

const emit = defineEmits<{
  viewStateChange: [state: MapViewState]
  flowClick: [flow: TrafficFlow]
}>()

const mapContainer = ref<HTMLDivElement | null>(null)
const map = shallowRef<maplibregl.Map | null>(null)
const deck = shallowRef<Deck | null>(null)

const defaultViewState: MapViewState = {
  longitude: 0,
  latitude: 20,
  zoom: 1.5,
  pitch: 0,
  bearing: 0
}

const currentViewState = ref<MapViewState>({ ...defaultViewState, ...props.viewState })

// Map styles
const lightStyle = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
const darkStyle = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

function getMapStyle() {
  return props.darkMode ? darkStyle : lightStyle
}

function initMap() {
  if (!mapContainer.value) return

  map.value = new maplibregl.Map({
    container: mapContainer.value,
    style: getMapStyle(),
    center: [currentViewState.value.longitude, currentViewState.value.latitude],
    zoom: currentViewState.value.zoom,
    pitch: currentViewState.value.pitch,
    bearing: currentViewState.value.bearing,
  })

  map.value.on('move', () => {
    if (!map.value) return
    const center = map.value.getCenter()
    currentViewState.value = {
      longitude: center.lng,
      latitude: center.lat,
      zoom: map.value.getZoom(),
      pitch: map.value.getPitch(),
      bearing: map.value.getBearing()
    }
  })

  map.value.on('moveend', () => {
    emit('viewStateChange', currentViewState.value)
  })

  map.value.on('load', () => {
    initDeck()
  })
}

function initDeck() {
  if (!map.value || !mapContainer.value) return

  deck.value = new Deck({
    parent: mapContainer.value,
    controller: false,
    initialViewState: currentViewState.value,
    layers: [],
    style: {
      position: 'absolute',
      top: '0',
      left: '0',
      pointerEvents: 'none'
    }
  })

  // Sync deck.gl with map
  map.value.on('move', syncDeck)
  map.value.on('resize', () => {
    if (deck.value && mapContainer.value) {
      deck.value.setProps({
        width: mapContainer.value.clientWidth,
        height: mapContainer.value.clientHeight
      })
    }
  })

  updateLayers()
}

function syncDeck() {
  if (!deck.value || !map.value) return

  const center = map.value.getCenter()
  deck.value.setProps({
    viewState: {
      longitude: center.lng,
      latitude: center.lat,
      zoom: map.value.getZoom(),
      pitch: map.value.getPitch(),
      bearing: map.value.getBearing()
    }
  })
}

function updateLayers() {
  if (!deck.value) return

  const layers = []

  // Arc layer for traffic flows
  if (props.flows.length > 0) {
    layers.push(
      new ArcLayer({
        id: 'traffic-arcs',
        data: props.flows,
        getSourcePosition: (d: TrafficFlow) => [d.source.lng, d.source.lat],
        getTargetPosition: (d: TrafficFlow) => [d.target.lng, d.target.lat],
        getSourceColor: (d: TrafficFlow) => d.color || [0, 128, 255, 200],
        getTargetColor: (d: TrafficFlow) => d.color || [255, 100, 100, 200],
        getWidth: (d: TrafficFlow) => Math.max(1, Math.min(d.value / 10000, 8)),
        greatCircle: true,
        pickable: false,
        onClick: (info: { object?: TrafficFlow }) => {
          if (info.object) {
            emit('flowClick', info.object)
          }
        }
      })
    )

    // Source points
    layers.push(
      new ScatterplotLayer({
        id: 'source-points',
        data: props.flows,
        getPosition: (d: TrafficFlow) => [d.source.lng, d.source.lat],
        getRadius: (d: TrafficFlow) => Math.max(4, Math.min(d.value / 50, 20)),
        getFillColor: [0, 128, 255, 180],
        getLineColor: [255, 255, 255, 200],
        lineWidthMinPixels: 1,
        stroked: true,
        radiusUnits: 'pixels',
        pickable: true
      })
    )

    // Target points
    layers.push(
      new ScatterplotLayer({
        id: 'target-points',
        data: props.flows,
        getPosition: (d: TrafficFlow) => [d.target.lng, d.target.lat],
        getRadius: (d: TrafficFlow) => Math.max(4, Math.min(d.value / 50, 20)),
        getFillColor: [255, 100, 100, 180],
        getLineColor: [255, 255, 255, 200],
        lineWidthMinPixels: 1,
        stroked: true,
        radiusUnits: 'pixels',
        pickable: true
      })
    )
  }

  deck.value.setProps({ layers })
}

// Watch for flow changes
watch(() => props.flows, updateLayers, { deep: true })

// Watch for dark mode changes
watch(() => props.darkMode, () => {
  if (map.value) {
    map.value.setStyle(getMapStyle())
  }
})

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  if (deck.value) {
    deck.value.finalize()
    deck.value = null
  }
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})

// Expose methods
defineExpose({
  flyTo: (options: { center?: [number, number]; zoom?: number; duration?: number }) => {
    map.value?.flyTo(options)
  },
  resetView: () => {
    map.value?.flyTo({
      center: [defaultViewState.longitude, defaultViewState.latitude],
      zoom: defaultViewState.zoom,
      duration: 1000
    })
  }
})
</script>

<template>
  <div ref="mapContainer" class="world-map" />
</template>

<style scoped>
.world-map {
  width: 100%;
  height: 100%;
  position: relative;
}

.world-map :deep(.maplibregl-canvas) {
  outline: none;
}

.world-map :deep(.maplibregl-ctrl-attrib) {
  font-size: 10px;
  opacity: 0.7;
}
</style>
