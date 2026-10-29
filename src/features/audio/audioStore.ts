import {create} from 'zustand'
import {persist} from 'zustand/middleware'
import {Howl, Howler} from 'howler'

export type AudioChannel = 'music' | 'ambient' | 'interaction'
const channels = new Map<AudioChannel, Howl>()
export const audioEngine = {
    register(channel: AudioChannel, src: string, loop = channel !== 'interaction') {
        channels.get(channel)?.unload()
        channels.set(channel, new Howl({src: [src], loop, volume: channel === 'interaction' ? 0.4 : 0.2}))
    },
    play(channel: AudioChannel) {
        const sound = channels.get(channel)
        if (sound && !sound.playing()) sound.play()
    },
    dispose() {
        channels.forEach(sound => sound.unload());
        channels.clear()
    },
}
export const useAudioStore = create<{ enabled: boolean; toggle: () => void }>()(persist((set, get) => ({
    enabled: false,
    toggle() {
        const enabled = !get().enabled
        Howler.mute(!enabled)
        if (enabled) {
            audioEngine.play('ambient');
            audioEngine.play('music')
        }
        set({enabled})
    },
}), {name: 'core-audio', onRehydrateStorage: () => state => Howler.mute(!state?.enabled)}))
