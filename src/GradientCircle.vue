<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { createNoise3D } from 'simplex-noise'
import { useSpring } from 'vue-use-spring'

const props = defineProps({
  name: { type: String, default: '' },
  active: { type: Boolean, default: false },
  size: { type: Number, default: 500 },
  blobs: {
    type: Array, default: () => ([
      { color: 'red', r: 0.4, base: [0.35, 0.45] },
      { color: 'yellow', r: 0.4, base: [0.65, 0.55] },
      { color: '#5ac8fa', r: 0.4, base: [0.5, 0.3] },
    ])
  },
})

watch(() => props.active, a => {
  activity.x = a ? 1 : 0
})

const activity = useSpring({ x: 0 }, {
  mass: 6,
  tension: 30,
  friction: 12,
  precision: 0.005,
})

// internal fallbacks when a blob doesn't specify its own
const DEFAULTS = { posSens: 1.0, sizeSens: 0.15, colorSens: 0.5, speed: 0.00025 }

const noise3D = createNoise3D()

function toPx(val, S) { return val <= 1 ? val * S : val }

const positions = ref(props.blobs.map(b => {
  const S = props.size ?? 200
  const bx = toPx(b.base[0], S)
  const by = toPx(b.base[1], S)
  const rMin = toPx(b.r, S)
  return { cx: bx, cy: by, r: rMin, op: 1 }
}))
// smoothed bases that gently ease to new props values (to avoid jumps)
const bases = ref(props.blobs.map(b => {
  const S = props.size ?? 200
  return { bx: toPx(b.base[0], S), by: toPx(b.base[1], S), rBase: toPx(b.r, S) }
}))
let rafId = 0
let lastTime = 0

function animate(time) {
  const dt = lastTime ? Math.min(1 / 25, (time - lastTime) / 1000) : 0 // cap dt to avoid large jumps
  lastTime = time
  // smooth noise-driven motion for turbulence offsets (no circular drift)
  const tz = time * 0.00035 + seed.value * 0.001
  turb.value.mx = noise3D(0.13, 0.57, tz)
  turb.value.my = noise3D(0.73, 0.19, tz + 17.3)
  turb.value.gx = noise3D(0.41, 0.83, tz / 2 + 33.7)
  turb.value.gy = noise3D(0.91, 0.27, tz / 2 + 59.1)
  props.blobs.forEach((b, i) => {
    const S = props.size ?? 300

    // ensure array slots exist if blobs length changes dynamically
    if (!positions.value[i]) positions.value[i] = { cx: S / 2, cy: S / 2, r: 1, op: 1 }
    if (!bases.value[i]) bases.value[i] = { bx: S / 2, by: S / 2, rBase: 1 }

    const targetBx = toPx(b.base[0], S)
    const targetBy = toPx(b.base[1], S)
    const targetR = toPx(b.r, S)

    const posSens = b.posSens ?? DEFAULTS.posSens
    const sizeSens = b.sizeSens ?? DEFAULTS.sizeSens
    const colorSens = b.colorSens ?? DEFAULTS.colorSens
    const speed = b.speed ?? DEFAULTS.speed

    // ease bases toward targets using exponential smoothing (6 Hz natural response)
    const lerpHz = 6
    const k = dt ? (1 - Math.exp(-lerpHz * dt)) : 1
    bases.value[i].bx += (targetBx - bases.value[i].bx) * k
    bases.value[i].by += (targetBy - bases.value[i].by) * k
    bases.value[i].rBase += (targetR - bases.value[i].rBase) * k

    // scale motion amplitude with component size (~ per unit posSens)
    const ampPos = S * posSens * 0.8
    const z = time * speed

    // normalize inputs so noise pattern is scale-agnostic
    const nx = bases.value[i].bx / S
    const ny = bases.value[i].by / S

    const n1 = noise3D(nx, ny, z + i) // [-1,1]
    const n2 = noise3D(ny, nx, z + i + 50)
    const n3 = noise3D((nx + ny) * 0.5, (nx - ny) * 0.5, z + i * 0.37 + 3.33)

    positions.value[i].cx = bases.value[i].bx + n1 * ampPos
    positions.value[i].cy = bases.value[i].by + n2 * ampPos

    const v = (n3 + 1) / 2 // [0,1]
    positions.value[i].r = Math.max(1, bases.value[i].rBase * (1 + v * sizeSens))
    const op = 0.75 + (v - 0.5) * 0.5 * colorSens
    positions.value[i].op = Math.min(1, Math.max(0, op))
  })
  rafId = requestAnimationFrame(animate)
}

onMounted(() => {
  rafId = requestAnimationFrame(animate)
})

onUnmounted(() => cancelAnimationFrame(rafId))

const grainSeed = ref(Math.floor(Math.random() * 10000))
const seed = ref(Math.floor(Math.random() * 10000))
const turb = ref({ mx: 0, my: 0, gx: 0, gy: 0 })

// keep internal arrays in sync with variable-length blobs
watch(() => props.blobs, (blobs) => {
  const S = props.size ?? 200
  // trim/extend positions to exactly match blobs length
  const newPositions = blobs.map((b, i) => {
    const prev = positions.value[i]
    if (prev) return prev
    return {
      cx: toPx(b.base[0], S),
      cy: toPx(b.base[1], S),
      r: Math.max(1, toPx(b.r, S)),
      op: 1,
    }
  })
  positions.value = newPositions

  const newBases = blobs.map((b, i) => {
    const prev = bases.value[i]
    if (prev) return prev
    return {
      bx: toPx(b.base[0], S),
      by: toPx(b.base[1], S),
      rBase: toPx(b.r, S),
    }
  })
  bases.value = newBases
}, { deep: true })


watch(() => props.name, () => {
  grainSeed.value = Math.floor(Math.random() * 10000)
  seed.value = Math.floor(Math.random() * 10000)
})
</script>

<template lang="pug">
svg(:viewBox="`0 0 ${size} ${size}`" :width="size" :height="size" :style="{filter: `blur(${activity.x* 20}px)`, transform: `scale(${1+activity.x*.8+turb.gx*.3*activity.x}) rotateZ(${turb.mx*50*activity.x}deg) rotateX(${turb.gy*10*activity.x}deg) rotateY(${turb.my*15*activity.x}deg)`}"  )
  defs
    filter#soft(color-interpolation-filters="sRGB" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse")
      feGaussianBlur(stdDeviation="40")
    
    filter#maskDistort(color-interpolation-filters="sRGB" 
      filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse"
      :x="-size * 0.25" :y="-size * 0.25" :width="size * 1.5" :height="size * 1.5")
      feTurbulence(type="fractalNoise" :baseFrequency="0.005*activity.x"  numOctaves="1" :seed result="noise")
      feOffset(in="noise" :dx="turb.mx" :dy="turb.my" result="noiseShifted")
      feDisplacementMap(in="SourceGraphic" in2="noiseShifted" :scale="activity.x * 60" xChannelSelector="R" yChannelSelector="G")
    
    mask#round
      rect(:width="size" :height="size" fill="black")
      // Apply the distortion filter to the white mask circle
      circle(:cx="size/2" :cy="size/2" :r="size/2-40+activity.x*20" fill="white" filter="url(#maskDistort)")
    
    //- filter#grain(
    //-   color-interpolation-filters="sRGB"
    //-   filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse"
    //-   :x="-size * 0.25" :y="-size * 0.25" :width="size * 1.5" :height="size * 1.5"
    //-   )
    //-   feGaussianBlur(in="SourceGraphic" stdDeviation="20" result="blur")
    //-   feTurbulence(type="fractalNoise" baseFrequency="0.01" numOctaves="4" :seed="grainSeed" stitchTiles="stitch" result="noise")
    //-   feOffset(in="noise" :dx="turb.gx" :dy="turb.gy" result="noiseShifted")
    //-   feDisplacementMap(in="blur" in2="noiseShifted" :scale="25 + 35*activity" xChannelSelector="R" yChannelSelector="G" result="dist")
    //-   feComposite(in="dist" in2="dist" operator="over")
  
  g(mask="url(#round)")
    circle(v-for="(b,i) in blobs" :key="i" filter="url(#soft)"
            :cx="positions[i].cx" :cy="positions[i].cy" :r="positions[i].r"
            :fill="b.color" :fill-opacity="positions[i].op"
            style="transition: fill 2000ms ease, fill-opacity 2000ms ease")
</template>
