import { describe, expect, it } from 'vitest'
import { MY_BOOKS } from '@/components/ui/bookshelf-doors-hero'

describe('MY_BOOKS', () => {
  it('contains the four demo books', () => {
    expect(MY_BOOKS.map((b) => b.title)).toEqual(['Walden', 'Ferma animalelor', '27 de pași', 'Cujo'])
  })
  it('has unique ids', () => {
    expect(new Set(MY_BOOKS.map((b) => b.id)).size).toBe(MY_BOOKS.length)
  })
})
