import { useEffect, useState } from 'react'

const gratitudePrompts = [
  'What is one person who made today a little easier?',
  'What is one ordinary comfort you noticed today?',
  'What is one thing your body helped you do?',
  'What is one place where you felt a little safe?',
]

const emptyPhases = []
const emptyValues = (fields = []) => Object.fromEntries(fields.map((field) => [field.name, '']))

export default function GuidedExercise({ config, onSave, savedMessage }) {
  const [active, setActive] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [seconds, setSeconds] = useState(config.phases?.[0]?.duration || 0)
  const [form, setForm] = useState(() => emptyValues(config.fields))
  const [randomPrompt, setRandomPrompt] = useState(gratitudePrompts[0])
  const phases = config.phases || emptyPhases
  const phase = phases[phaseIndex]
  const timed = Boolean(phase?.duration)
  const progress = phases.length > 1 ? `${phaseIndex + 1} of ${phases.length}` : ''
  const complete = phaseIndex === phases.length - 1 && (!timed || seconds === 0)

  useEffect(() => {
    if (!active || !timed) return undefined
    const interval = setInterval(() => {
      setSeconds((current) => {
        if (current > 1) return current - 1
        if (phaseIndex === phases.length - 1) {
          setActive(false)
          return 0
        }
        setPhaseIndex((currentPhase) => currentPhase + 1)
        return phases[phaseIndex + 1]?.duration || 0
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [active, timed, phaseIndex, phases])

  const reset = () => {
    setActive(false)
    setPhaseIndex(0)
    setSeconds(phases[0]?.duration || 0)
  }

  const begin = () => {
    if (complete) {
      setPhaseIndex(0)
      setSeconds(phases[0]?.duration || 0)
    }
    setActive(true)
  }

  const next = () => {
    if (phaseIndex === phases.length - 1) {
      setActive(false)
      setSeconds(0)
      return
    }
    setPhaseIndex((current) => current + 1)
    setSeconds(phases[phaseIndex + 1]?.duration || 0)
    setActive(false)
  }

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  const submit = (event) => {
    event.preventDefault()
    onSave?.(form)
    setForm(emptyValues(config.fields))
  }

  return <div className="guided-layout">
    <section className="breathing-surface guided-card">
      <div className="guided-card-heading">
        <p className="eyebrow">{config.type === 'text-prompt' ? 'Write and reflect' : 'Guided practice'}</p>
        <span className="progress-label">{progress}</span>
      </div>
      {config.type === 'text-prompt' ? <form onSubmit={submit} className="guided-form">
        {config.title === 'Gratitude Wheel' && <div className="wheel-prompt">
          <p className="guided-prompt">{randomPrompt}</p>
          <button type="button" className="secondary-button" onClick={() => setRandomPrompt(gratitudePrompts[Math.floor(Math.random() * gratitudePrompts.length)])}>Spin for a prompt</button>
        </div>}
        {config.fields.map((field) => <label key={field.name}>{field.label}{field.multiline === false ? <input required name={field.name} value={form[field.name]} onChange={update} placeholder={field.placeholder} /> : <textarea required name={field.name} value={form[field.name]} onChange={update} placeholder={field.placeholder} rows={field.name === 'entry' ? 9 : 4} />}</label>)}
        <button className="primary-button">Save to journal</button>
        {savedMessage && <p className="form-message" role="status">{savedMessage}</p>}
      </form> : <>
        <div className={`breath-box phase-${phaseIndex % 4} ${active ? 'is-active' : ''}`} aria-live="polite">
          <span>{phase?.label}</span>
          <strong>{timed ? seconds : phaseIndex + 1}</strong>
        </div>
        <p className="guided-prompt">{phase?.prompt || (active ? `${phase?.label} gently` : config.instructions)}</p>
        <div className="button-row guided-controls">
          {active ? <button className="secondary-button" onClick={() => setActive(false)}>Pause</button> : <button className="primary-button" onClick={begin}>{phaseIndex === 0 ? 'Begin practice' : complete ? 'Begin again' : 'Resume'}</button>}
          {config.type === 'steps' && <button className="primary-button" onClick={next}>{complete ? 'Finish' : 'Next'}</button>}
          <button className="text-button" onClick={reset}>Restart</button>
        </div>
        {timed && !active && <p className="guided-helper">{complete ? 'Practice complete. Take a moment before you move on.' : 'Paused. Resume when you are ready.'}</p>}
      </>}
    </section>
    <section className="surface affirmation">
      <p className="eyebrow">For today</p>
      <h2>{config.affirmation}</h2>
      <p className="muted">Keep this close as a gentle thought, not a task.</p>
      {config.type !== 'text-prompt' && <p className="affirmation-instruction">{config.instructions}</p>}
    </section>
  </div>
}
