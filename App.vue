<script setup>
import { Midi } from 'tone'
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useMIDI } from './src/useMidi'

import { createNoise3D } from 'simplex-noise'
import { TransitionPresets, useTransition } from '@vueuse/core'

import GradientCircle from './src/GradientCircle.vue'
import { useSampler } from './src/useSampler'

import globes from './src/globes.yaml'
const currentGlobe = ref(globes[0])

const { sampler, presets, Presets, currentPreset, loading, progress, audioBuffer, params, selectPreset, loadFile, loadUrl, triggerAttack, triggerRelease } = useSampler()

const { activeNotes, midiNote, guessChords, inputs, keyOffset } = useMIDI()

watch(midiNote, n => {
  if (n.velocity > 0) triggerAttack(Midi(n.number).toNote(), "+0.000000001", n.velocity)
  else triggerRelease(Midi(n.number).toNote(), "+0.000000001")
})

const globeWithNotes = computed(() => {
  return {
    ...currentGlobe.value,
    blobs: [
      ...currentGlobe.value.blobs,
      ...Object.entries(activeNotes).filter(e => e[1] > 0).map(e => ({
        color: `hsla(${30 * ((e[0] - 9) % 12)}deg,50%,50%,${Math.random() * 0.1 + 0.05})`,
        r: Math.random() * 0.3 + 0.3,
        base: [Math.random(), Math.random()],
        posSens: 0.8,
        sizeSens: .15,
        colorSens: 0.5,
        speed: 0.00025
      })),

    ]
  }
})

const active = computed(() => Object.entries(activeNotes).filter(e => e[1] > 0).length ? 1 : 0)

onMounted(() => {
  novis.value = window.location.hash == '#novis'
})

const started = ref(false)
const novis = ref(false)

const settingsOpen = ref(false)
const settingsDialog = ref()

watch(settingsOpen, open => {
  if (open) settingsDialog.value.showModal()
  else settingsDialog.value.close()
})

const editedPreset = ref(null)
const presetDialog = ref()
const newPresetSample = ref(['C4', ''])

watch(editedPreset, (preset) => {
  if (preset) presetDialog.value.showModal()
  else presetDialog.value.close()
})

</script>

<template lang='pug'>
.flex.flex-col.items-center.w-full.h-100svh.justify-between.text-white.overflow-hidden
 
  button.p-4.top-2.left-2.absolute.op-10.hover-op-100.transition.text-sm(@click="started = !started") Help
  button.p-4.top-2.right-2.absolute.op-10.hover-op-100.transition.text-sm(@click="settingsOpen = !settingsOpen") Settings

  dialog.z-300.rounded-2xl.bg-transparent.min-w-60(ref="settingsDialog" @close="settingsOpen = false" @click.self="settingsOpen = false")
    .p-3.flex.flex-col.gap-2.bg-amber-100.bg-op-20.backdrop-blur-xl.shadow.relative(@click.stop)
      .text-2xl Settings
      p Key Offset {{keyOffset}}
      input(type="range" :value="keyOffset" @input="keyOffset = Number($event.target.value)" min="-2" max="2" step="1")
      label Reverb Wet {{params.reverbWet}}
      input(type="range" :value="params.reverbWet" @input="params.reverbWet = Number($event.target.value)" min="0" max="1" step="0.01")
      label Reverb Decay {{params.reverbDecay}}
      input(type="range" :value="params.reverbDecay" @input="params.reverbDecay = Number($event.target.value)" min="0" max="10" step="0.01")
      label Delay Wet {{params.delayWet}}
      input(type="range" :value="params?.delayWet" @input="params.delayWet = Number($event.target.value)" min="0" max="1" step="0.01")
      label Delay Feedback {{params.delayFeedback}}
      input(type="range" :value="params.delayFeedback" @input="params.delayFeedback = Number($event.target.value)" min="0" max="1" step="0.01")

      //- .text-xl Preset "{{currentPreset}}"
      //- textarea.rounded-xl.text-sm.p-2(rows=8 :value="JSON.stringify(presets[currentPreset], null, 2)")
      //- .flex
      //-   button.px-2.border-2.rounded-xl.border-dark(@click="presets[currentPreset] = JSON.parse($event.target.value)") Save
      //-   button.px-2.border-2.rounded-xl.border-dark(@click="presets[currentPreset] = Presets[currentPreset]") Reset

      button.px-2.border-2.rounded-xl.border-dark(@click="settingsOpen = false") ✕ Close

  template(v-if="started")

    dialog.z-300.rounded-2xl.bg-transparent.min-w-90.max-w-100(ref="presetDialog" @close="editedPreset = null" @click.self="editedPreset = null")
      .p-3.flex.flex-col.gap-2.bg-amber-100.bg-op-20.backdrop-blur-xl.shadow.relative(@click.stop v-if="editedPreset")
        .flex
          .text-2xl.flex-1 Preset "{{editedPreset}}"
          button.px-2.border-2.rounded-xl.border-dark(@click="presets[editedPreset] = Presets[editedPreset]") Reset
       
        .p-2.flex.gap-2.w-full.items-center(v-for="url in Object.entries(presets[editedPreset].urls)" :key="url")
          .font-bold {{url[0]}}
          .font-mono.text-xs.break-all {{url[1].slice(0, 100)}}
          button.px-2.border-2.rounded-xl.border-dark(@click="delete presets[editedPreset].urls[url[0]]") ✕
       
        .p-2.flex.gap-2.w-full
          input.rounded-xl.w-10.p-2(type="text" v-model="newPresetSample[0]" placeholder="C4")
          input.rounded-xl.flex-1.p-2.text-xs(type="text" v-model="newPresetSample[1]" placeholder="URL of the sample file - mp3 or wav")
          button.px-2.border-2.rounded-xl.border-dark(@click="presets[editedPreset].urls[newPresetSample[0]] = newPresetSample[1]; newPresetSample = ['C4', '']") Add
          

    .flex.flex-wrap.gap-2.justify-center.z-200.flex-1
      .p-4.op-75.hover-op-85.active-op-100.cursor-pointer.text-center.tracking-wider.transition-700.variable-text.whitespace-nowrap.select-none(
        v-for="globe in globes" :key="globe.name" 
        @click="currentGlobe = globe; selectPreset(globe.preset)" 
        :class="{'active': currentGlobe.name == globe.name}" 
        @dblclick="editedPreset = globe.preset"
        style="contain: layout;") {{globe.name}} 

    .p-4.flex.flex-wrap.gap-8.justify-center.items-center.w-full.flex-auto.z-10(v-if="!novis")
      .flex.items-center.gap-6.flex-wrap.w-full.justify-center
        .flex.text-center.relative.justify-center.items-start.flex-col(style="perspective: 1000px; transform-style: preserve-3d;")
          GradientCircle(
            :active="!!active"
            v-bind="globeWithNotes")

    .p-2.flex.flex-wrap.gap-2.absolute.bottom-12.z-100.op-90(v-if="loading") Loading...

    .p-2.flex.flex-wrap.gap-2.absolute.bottom-2.z-100
      .p-2.op-70.font-thin(v-for="(chord,c) in guessChords" :key="c") {{chord}}

  .flex.flex-col.gap-4.flex-1.max-w-55ch.leading-loose.text-center(v-else)
    .text-2xl Love. Share. Play.
    p Turn on your speakers, then connect TouchMe or press (Z-M and Q-P parts) keys on your computer keyboard to start playing. This website is optimized for desktop only.
    a.underline(href="https://www.youtube.com/@PlayTronica" target="_blank") Watch this tutorial to find out more.
    p Now you can visualise notes and experiment with smooth and sassy sounds. Our TouchMe devices can turn a hug into music, or a kiss into a musical note.
    p The musical content presented on this site is for non-commercial use only. If your computer is slow, try <a class="underline" href="#novis" @click="novis = true;started = true">playing without visuals</a>.
    .flex.flex-col.gap-4.items-center(v-if="Object.keys(inputs).length") 
      .text-lg.inline-flex.gap-1
        span(v-for="input in inputs" :key="input") {{input.name}}
        span connected!
    .text-lg(v-else) Connect your TouchMe
    button.button.relative.overflow-hidden.flex.items-center.justify-center(@click="started = true")
      .absolute.top-9.text-2xl.z-100 START
      img.invert.grayscale.w-60.h-30(src="/swoosh.svg")
    .text-sm Please email <a class="underline" href="mailto:support@playtronica.com">support@playtronica.com</a> for assistance.  We are here for you.

    
</template>

<style lang="postcss">
@font-face {
  font-family: 'Poppins Variable';
  src: url('/Poppins-VariableFont_wght.otf') format('opentype');
  font-weight: 100 500;
  font-display: swap;
}

html,
body,
#app {
  font-family: 'Poppins Variable', sans-serif;
  @apply max-h-100svh overlow-hidden;
  background-color: #006140;
}

.variable-text {
  font-family: 'Poppins Variable', sans-serif;
  font-variation-settings: 'wght' 100;
  transition: font-variation-settings 0.5s ease-in-out;
}

.variable-text:hover {
  font-variation-settings: 'wght' 200;
}

.variable-text.active {
  font-variation-settings: 'wght' 500;
}
</style>