import { describe, expect, it } from 'vitest'
import { COURSES, courseKey } from './courses'

describe('courseKey', () => {
  it.each([
    ['Ciência da Computação (Bacharelado)', 'cc'],
    ['Engenharia de Computação', 'ec'],
    ['Engenharia de Computação (Engenharia Grupo II)', 'ec'],
    ['Sistemas de Informação', 'si'],
    ['Computação (Licenciatura)', 'lic'],
  ])('%s → %s', (course, key) => {
    expect(courseKey(course)).toBe(key)
  })

  it('tem os quatro cursos em ordem fixa', () => {
    expect(COURSES.map((c) => c.key)).toEqual(['cc', 'ec', 'si', 'lic'])
    expect(COURSES.map((c) => c.label)).toEqual([
      'Ciência da Computação',
      'Engenharia de Computação',
      'Sistemas de Informação',
      'Licenciatura',
    ])
  })
})
