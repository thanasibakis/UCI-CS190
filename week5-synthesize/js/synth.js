const keymap = {
    'a': 220,
    's': 246.94,
    'd': 277.18,
    'f': 293.66,
    'j': 329.63,
    'k': 369.99,
    'l': 415.30,
    ';': 440
}

const context = new AudioContext()

const masterGainNode = new GainNode(context, options = { "gain": 0.1 })
masterGainNode.connect(context.destination)

let previousNote = null
let previousGain = null
let previousKey = null

document.onkeydown = (event) => {
    // Determine the frequency of the note to play
    const key = event.key.toLowerCase()
    let frequency = keymap[key]

    // The spacebar represents a half-step up from the previous note,
    // to be used like a grace note, if pressed while the previous key
    // is still being held
    if (key === ' ')
        frequency = keymap[previousKey] * Math.pow(2, 1/12)

    // If the key corresponds to an actual note, play it
    if (frequency) {
        console.log(frequency)
        // The shift key brings the note an octave up
        const octaveMultiplier = event.shiftKey ? 2 : 1

        // If this KeyboardEvent is not the result of the key being held down,
        // play the note
        if (key !== previousKey)
            playNote(frequency * octaveMultiplier)

        // Keep track of the key that was just pressed
        previousKey = key
    }
}

document.onkeyup = (event) => {
    // Determine the letter pressed
    const key = event.key.toLowerCase()

    // Stop the note if this was a single key being pressed and released
    if (previousKey == key)
        stopNote()
    
    // if the if statement does not occur, it's because a different note was
    // played before the key went up, and that note's play start already
    // stopped this key's note
}

// Plays a note at the given frequency
playNote = (frequency) => {
    // Get the nodes needed to produce our sound signature
    const oscillators = [1, 2, 3, 4, 5, 6, 7, 8].map(overtone => getOscillatorNode(frequency * overtone))
    const gainNode = getGainNode([0, 0.8, 0.3, 0.3, 0.2, 0.2, 0.2, 0.2], 1) // envelope attack, decay, & sustain
    const vibratoNode = getDetuneVibratoNode(6, [0, 0, 0, 10, 15, 20], 2)
    
    // Hook everything up
    oscillators.map(osc => vibratoNode.connect(osc.detune))
    oscillators.map(osc => osc.connect(gainNode))
    gainNode.connect(masterGainNode)

    // Stop any note currently playing, we're synthesizing a monophonic instrument :)
    if (previousNote)
        stopNote()
    
    // Start the new note
    oscillators.map(osc => osc.start())

    // Keep track of this note so we can stop it later
    previousNote = oscillators
    previousGain = gainNode
}

// Returns a sine node of the given frequency
getOscillatorNode = (frequency) => {
    return new OscillatorNode(context, options = { "frequency": frequency })
}

// Returns a gain node with the given envelope (which spans the given duration, in seconds)
getGainNode = (envelope, envelopeDuration) => {
    const gainNode = new GainNode(context)
    gainNode.gain.setValueCurveAtTime(
        new Float32Array(envelope),
        context.currentTime,
        envelopeDuration
    )

    return gainNode
}

// Returns the node needed to modulate an oscillator's detune AudioParam
// at the given frequency. The depth of the vibrato is specified over time
// by the given envelope (which spans the given duration, in seconds)
getDetuneVibratoNode = (frequency, envelope, envelopeDuration) => {
    const detuneLFO = getOscillatorNode(frequency)
    const vibratoGainNode = getGainNode(envelope, envelopeDuration)

    detuneLFO.start()

    return detuneLFO.connect(vibratoGainNode) // returns vibratoGainNode
}

// Interrupt the previous note and fade it out
stopNote = () => {
    previousGain.gain.cancelScheduledValues(0)
    previousGain.gain.linearRampToValueAtTime(0.01, context.currentTime + 0.05) // envelope release
    previousNote.map(osc => osc.stop())

    previousGain = null
    previousNote = null
    previousKey = null
}