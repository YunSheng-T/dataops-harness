// Offline checks for the brand occupants.
import { createDataopsBrand } from '../src/brand.js'

const React = {
  createElement(type, props, ...children) {
    return { type, props: { ...(props || {}), children: children.length <= 1 ? children[0] : children } }
  }
}
const Brand = createDataopsBrand(React)
const results = []
const check = (name, fn) => {
  try {
    fn()
    results.push(`ok   ${name}`)
  } catch (error) {
    results.push(`FAIL ${name}: ${error.message}`)
    process.exitCode = 1
  }
}
const assert = (condition, message) => { if (!condition) throw new Error(message) }

check('mark renders the ribbon at the native horizontal ratio', () => {
  const svg = Brand.Mark({ size: 18 })
  assert(svg.type === 'svg', 'mark is not an svg')
  assert(svg.props.width === 18, 'width not applied')
  assert(Math.abs(svg.props.height - 18 * (17.6 / 24)) < 0.001, 'wide mark ratio not applied')
  assert(svg.props.viewBox === '0 0 24 17.6', 'mark viewBox')
  const child = svg.props.children
  assert(child.type === 'path', 'mark has no path')
  assert(child.props.fillRule === 'evenodd', 'ribbon must use evenodd fill to keep the loop counters')
  assert(child.props.d.length > 1000, 'ribbon path looks empty')
})

check('large mark keeps the same geometry', () => {
  const svg = Brand.Mark({ size: 34 })
  assert(svg.props.children.props.d === Brand.Mark({ size: 18 }).props.children.props.d, 'geometry changed with size')
})

check('name renders the custom DataOps wordmark svg', () => {
  const name = Brand.Name()
  assert(name.type === 'svg', 'name is not an svg')
  assert(name.props['aria-label'] === 'DataOps', 'name aria label missing')
  assert(name.props.className === 'do-brand-name', 'name class missing')
  const child = name.props.children
  assert(child.type === 'path', 'wordmark has no path')
  assert(child.props.d.length > 1000, 'wordmark path looks empty')
  assert(child.props.strokeWidth === 0.35, 'wordmark optical stroke')
})

check('hero mark forwards size and class', () => {
  const hero = Brand.HeroMark({ size: 34, className: 'hero-mark' })
  const svg = Brand.Mark(hero.props)
  assert(svg.props.width === 34, 'hero size missing')
  assert(svg.props.className === 'hero-mark', 'hero class missing')
})

check('brand styles use semantic tokens only', () => {
  let css = ''
  Brand.installStyles({
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, textContent: '' }),
    head: { appendChild: node => { css = node.textContent } }
  })
  assert(css.includes('--dsw-alias-'), 'brand css does not use DSH tokens')
  const withoutVars = css.replace(/var\([^)]*\)/gu, '').replace(/@font-face\{[^}]*\}/gu, '')
  assert(!/#[0-9a-f]{3,8}\b/iu.test(withoutVars), 'literal color outside a token fallback')
})

console.log(results.join('\n'))
