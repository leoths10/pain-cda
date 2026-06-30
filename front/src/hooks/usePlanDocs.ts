import { useCallback, useState } from 'react'
import { apiFetch } from '../utils/apiFetch'
import type {
  DocAnnotation, DocArrow, PlanDocFull, PlanDocSummary,
} from '../types/planDoc'

export type EditTool = 'select' | 'annotation' | 'arrow'

const DEFAULT_ANNOTATION_COLOR = '#fbbf24'
const DEFAULT_ARROW_COLOR = '#ef4444'
const NEW_ANNOTATION_W = 170
const NEW_ANNOTATION_H = 64

/** Génère un uid client (fallback si crypto.randomUUID indisponible). */
function genUid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `a-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

async function readJson(res: Response): Promise<unknown> {
  try { return await res.json() } catch { return null }
}

/**
 * Gère l'état de la couche documentaire côté client :
 * liste des calques, calque courant, copie de travail (annotations + flèches)
 * éditable, et les appels CRUD vers l'API `/api/plan-docs`.
 */
export function usePlanDocs() {
  const [list, setList] = useState<PlanDocSummary[]>([])
  const [currentDoc, setCurrentDoc] = useState<PlanDocFull | null>(null)
  const [annotations, setAnnotations] = useState<DocAnnotation[]>([])
  const [arrows, setArrows] = useState<DocArrow[]>([])

  const [editMode, setEditModeRaw] = useState(false)
  const [tool, setToolRaw] = useState<EditTool>('select')
  const [arrowFrom, setArrowFrom] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Liste ──────────────────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    try {
      const res = await apiFetch('/api/plan-docs')
      if (res.ok) setList((await readJson(res) as PlanDocSummary[]) ?? [])
    } catch {
      setError('Impossible de charger la liste des calques.')
    }
  }, [])

  // ── Ouverture / fermeture ──────────────────────────────────────────────────
  const openDoc = useCallback(async (id: number) => {
    setError(null)
    try {
      const res = await apiFetch(`/api/plan-docs/${id}`)
      if (!res.ok) { setError('Calque introuvable.'); return }
      const doc = await readJson(res) as PlanDocFull
      setCurrentDoc(doc)
      setAnnotations(doc.annotations ?? [])
      setArrows(doc.arrows ?? [])
      setDirty(false)
      setEditModeRaw(false)
      setToolRaw('select')
      setArrowFrom(null)
    } catch {
      setError('Erreur réseau lors de l\'ouverture du calque.')
    }
  }, [])

  const closeDoc = useCallback(() => {
    setCurrentDoc(null)
    setAnnotations([])
    setArrows([])
    setDirty(false)
    setEditModeRaw(false)
    setArrowFrom(null)
  }, [])

  // ── Création / suppression ─────────────────────────────────────────────────
  const createDoc = useCallback(async (title: string, description?: string, tags?: string[]) => {
    setError(null)
    try {
      const res = await apiFetch('/api/plan-docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: description ?? null, tags: tags ?? [] }),
      })
      if (!res.ok) { setError('Échec de la création du calque.'); return }
      const doc = await readJson(res) as PlanDocFull
      setCurrentDoc(doc)
      setAnnotations([])
      setArrows([])
      setDirty(false)
      setEditModeRaw(true)
      setToolRaw('annotation')
      setArrowFrom(null)
      await loadList()
    } catch {
      setError('Erreur réseau lors de la création.')
    }
  }, [loadList])

  const deleteDoc = useCallback(async (id: number) => {
    try {
      const res = await apiFetch(`/api/plan-docs/${id}`, { method: 'DELETE' })
      if (res.ok) {
        if (currentDoc?.id === id) closeDoc()
        await loadList()
      }
    } catch {
      setError('Échec de la suppression.')
    }
  }, [currentDoc, closeDoc, loadList])

  // ── Sauvegarde du contenu ──────────────────────────────────────────────────
  const saveCurrent = useCallback(async () => {
    if (!currentDoc) return
    setSaving(true)
    setError(null)
    try {
      const res = await apiFetch(`/api/plan-docs/${currentDoc.id}/content`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotations, arrows }),
      })
      if (!res.ok) { setError('Échec de la sauvegarde.'); return }
      setDirty(false)
      await loadList()
    } catch {
      setError('Erreur réseau lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }, [currentDoc, annotations, arrows, loadList])

  // ── Mode / outils ──────────────────────────────────────────────────────────
  const setEditMode = useCallback((on: boolean) => {
    setEditModeRaw(on)
    setArrowFrom(null)
    if (!on) setToolRaw('select')
  }, [])

  const setTool = useCallback((t: EditTool) => {
    setToolRaw(t)
    setArrowFrom(null)
  }, [])

  // ── Mutations d'annotations ────────────────────────────────────────────────
  const addAnnotation = useCallback((x: number, y: number) => {
    const ann: DocAnnotation = {
      uid: genUid(),
      text: 'Nouvelle annotation',
      x: x - NEW_ANNOTATION_W / 2,
      y: y - NEW_ANNOTATION_H / 2,
      width: NEW_ANNOTATION_W,
      height: NEW_ANNOTATION_H,
      color: DEFAULT_ANNOTATION_COLOR,
    }
    setAnnotations(prev => [...prev, ann])
    setDirty(true)
  }, [])

  const moveAnnotation = useCallback((uid: string, x: number, y: number) => {
    setAnnotations(prev => prev.map(a => (a.uid === uid ? { ...a, x, y } : a)))
    setDirty(true)
  }, [])

  const editAnnotationText = useCallback((uid: string) => {
    const current = annotations.find(a => a.uid === uid)
    const next = window.prompt('Texte de l\'annotation :', current?.text ?? '')
    if (next === null) return
    setAnnotations(prev => prev.map(a => (a.uid === uid ? { ...a, text: next } : a)))
    setDirty(true)
  }, [annotations])

  const deleteAnnotation = useCallback((uid: string) => {
    setAnnotations(prev => prev.filter(a => a.uid !== uid))
    setArrows(prev => prev.filter(ar =>
      ar.from_uid !== uid && !(ar.target_type === 'annotation' && ar.target_ref === uid),
    ))
    setArrowFrom(f => (f === uid ? null : f))
    setDirty(true)
  }, [])

  // ── Flèches ────────────────────────────────────────────────────────────────
  const addArrow = useCallback((fromUid: string, targetType: DocArrow['target_type'], targetRef: string) => {
    setArrows(prev => [...prev, {
      from_uid: fromUid,
      target_type: targetType,
      target_ref: targetRef,
      color: DEFAULT_ARROW_COLOR,
    }])
    setDirty(true)
  }, [])

  /** Clic sur une annotation en mode flèche : choisit la source puis la cible. */
  const onAnnotationClickArrow = useCallback((uid: string) => {
    if (tool !== 'arrow') return
    setArrowFrom(prev => {
      if (prev === null) return uid
      if (prev !== uid) addArrow(prev, 'annotation', uid)
      return null
    })
  }, [tool, addArrow])

  /** Clic sur une application en mode flèche : complète la flèche en cours. */
  const completeArrowToApp = useCallback((appName: string): boolean => {
    if (tool !== 'arrow' || arrowFrom === null) return false
    addArrow(arrowFrom, 'app', appName)
    setArrowFrom(null)
    return true
  }, [tool, arrowFrom, addArrow])

  return {
    list, loadList,
    currentDoc, openDoc, closeDoc, createDoc, deleteDoc,
    saveCurrent, saving, dirty, error,
    annotations, arrows,
    editMode, setEditMode,
    tool, setTool, arrowFrom,
    addAnnotation, moveAnnotation, editAnnotationText, deleteAnnotation,
    onAnnotationClickArrow, completeArrowToApp,
  }
}

export type PlanDocsController = ReturnType<typeof usePlanDocs>
