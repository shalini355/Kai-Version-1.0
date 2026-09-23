import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Clock3, Sparkles } from 'lucide-react'
import api from '../api'
import GuidedExercise from './GuidedExercise'
import { categories, exercises } from '../data/exercises'
import { useState } from 'react'

const slugify = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export function WellnessLanding() {
  return <div className="page"><div className="page-intro"><div><p className="eyebrow">A little care, on demand</p><h1>Wellness toolkit</h1><p className="intro-copy">Choose a guided practice for the moment you are in. You can pause or leave any exercise at any time.</p></div></div><div className="toolkit-categories">{categories.map((category) => <section className="toolkit-category" key={category}><div className="category-heading"><div><p className="eyebrow">{category}</p><h2>{exercises.filter((exercise) => exercise.category === category).length} practices</h2></div></div><div className="exercise-grid">{exercises.filter((exercise) => exercise.category === category).map((exercise) => <article className="exercise-card" key={exercise.title}><div><h2>{exercise.title}</h2><p>{exercise.subtitle}</p></div><div className="exercise-meta"><span><Clock3 size={14} />{exercise.duration}</span><Link className="text-button begin-link" to={`/wellness/${slugify(exercise.title)}`}>Begin</Link></div></article>)}</div></section>)}</div></div>
}

function journalContent(config, values) {
  return config.fields.map((field) => `${field.label}\n${values[field.name] || ''}`).join('\n\n')
}

export function WellnessExercisePage() {
  const { slug } = useParams(); const config = exercises.find((exercise) => slugify(exercise.title) === slug); const [savedMessage, setSavedMessage] = useState(''); const [anchor, setAnchor] = useState('')
  if (!config) return <div className="page"><div className="empty-state"><strong>That practice could not be found.</strong><Link className="text-link" to="/wellness">Back to toolkit</Link></div></div>
  const saveJournal = async (values) => { try { await api.post('/journal', { title: `${config.title} reflection`, content: journalContent(config, values), exerciseType: config.title }); setSavedMessage('Saved to your private journal.'); } catch { setSavedMessage('This entry could not be saved. Please try again.') } }
  const preparedConfig = config.title === 'Anchor Breathing' && anchor ? { ...config, instructions: `Your anchor word is “${anchor}”. Repeat it quietly with each exhale.` } : config
  return <div className="page"><Link className="back-link" to="/wellness"><ArrowLeft size={16} />Back to toolkit</Link><div className="page-intro exercise-intro"><div><p className="eyebrow">{config.category}</p><h1>{config.title}</h1><p className="intro-copy">{config.subtitle}</p></div></div>{config.title === 'Anchor Breathing' && <div className="anchor-input surface"><label>Choose an anchor word<input value={anchor} onChange={(event) => setAnchor(event.target.value)} placeholder="steady" /></label></div>}<GuidedExercise config={preparedConfig} onSave={config.type === 'text-prompt' ? saveJournal : undefined} savedMessage={savedMessage} />{config.type !== 'text-prompt' && <p className="wellness-note"><Sparkles size={15} />You are in control of this practice. Pause, restart, or leave whenever you need.</p>}</div>
}
