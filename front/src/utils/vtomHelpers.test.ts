import { describe, it, expect } from 'vitest'
import { parseParameter, cleanHtmlLabel, wrapText, clipToRect } from './vtomHelpers'
import type { VtomResource } from '../types/vtom'

// ── parseParameter ────────────────────────────────────────────────────────────

describe('parseParameter', () => {
  const resources = new Map<string, VtomResource>([
    ['HOST', { name: 'HOST', type: 'String', value: 'srv01' }],
    ['PORT', { name: 'PORT', type: 'Integer', value: '8080' }],
  ])

  it('résout une référence {NOM} connue', () => {
    const { text, resourceRefs } = parseParameter('--host={HOST}', resources)
    expect(text).toBe('--host={HOST}')           // le texte n'est jamais modifié
    expect(resourceRefs).toEqual([{ name: 'HOST', value: 'srv01', type: 'String' }])
  })

  it('résout plusieurs références dans l\'ordre d\'apparition', () => {
    const { resourceRefs } = parseParameter('{HOST}:{PORT}', resources)
    expect(resourceRefs).toEqual([
      { name: 'HOST', value: 'srv01', type: 'String' },
      { name: 'PORT', value: '8080', type: 'Integer' },
    ])
  })

  it('ignore les références inconnues', () => {
    const { resourceRefs } = parseParameter('{HOST}/{UNKNOWN}', resources)
    expect(resourceRefs).toEqual([{ name: 'HOST', value: 'srv01', type: 'String' }])
  })

  it('retourne une liste vide quand aucune référence', () => {
    const { text, resourceRefs } = parseParameter('--verbose', resources)
    expect(text).toBe('--verbose')
    expect(resourceRefs).toEqual([])
  })
})

// ── cleanHtmlLabel ────────────────────────────────────────────────────────────

describe('cleanHtmlLabel', () => {
  it('supprime les balises HTML', () => {
    expect(cleanHtmlLabel('<b>Hello</b>')).toBe('Hello')
  })

  it('décode les entités nommées (accents français)', () => {
    expect(cleanHtmlLabel('&eacute;t&eacute;')).toBe('été')
    expect(cleanHtmlLabel('caf&eacute; &amp; cr&egrave;me')).toBe('café & crème')
  })

  it('décode les entités numériques décimales et hexadécimales', () => {
    expect(cleanHtmlLabel('&#233;')).toBe('é')
    expect(cleanHtmlLabel('&#xE9;')).toBe('é')
  })

  it('normalise les espaces et trim', () => {
    expect(cleanHtmlLabel('  a   b  ')).toBe('a b')
  })

  it('le <br> devient une coupure puis est normalisé en espace', () => {
    // <br> → '\n', puis la normalisation \s+ → ' ' le ramène à un espace.
    expect(cleanHtmlLabel('ligne1<br/>ligne2')).toBe('ligne1 ligne2')
  })
})

// ── wrapText ──────────────────────────────────────────────────────────────────

describe('wrapText', () => {
  it('coupe sur les frontières de mots', () => {
    expect(wrapText('one two three', 7)).toEqual(['one two', 'three'])
  })

  it('garde une ligne courte intacte', () => {
    expect(wrapText('court', 10)).toEqual(['court'])
  })

  it('ne coupe pas un mot plus long que la limite', () => {
    expect(wrapText('supercalifragilistic', 5)).toEqual(['supercalifragilistic'])
  })

  it('respecte les retours à la ligne existants', () => {
    expect(wrapText('a\nb', 10)).toEqual(['a', 'b'])
  })

  it('retourne [""] pour une chaîne vide', () => {
    expect(wrapText('', 10)).toEqual([''])
  })
})

// ── clipToRect ────────────────────────────────────────────────────────────────

describe('clipToRect', () => {
  // Rectangle 20×20 en (0,0) → centre (10,10), demi-dimensions utiles = 10-4 = 6.

  it('clippe sur le bord droit pour une origine à droite', () => {
    expect(clipToRect(100, 10, 0, 0, 20, 20)).toEqual([16, 10])
  })

  it('clippe sur le bord haut pour une origine au-dessus', () => {
    expect(clipToRect(10, 100, 0, 0, 20, 20)).toEqual([10, 16])
  })

  it('retourne le centre quand l\'origine est au centre', () => {
    expect(clipToRect(10, 10, 0, 0, 20, 20)).toEqual([10, 10])
  })

  it('clippe sur le coin pour une diagonale à 45°', () => {
    expect(clipToRect(100, 100, 0, 0, 20, 20)).toEqual([16, 16])
  })
})
