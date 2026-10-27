/**
 * Browser entry for the DataOps brand package.
 *
 * Occupies three native brand seats; no other part of the shell changes:
 *   - sidebar.brand.mark          infinity mark in the sidebar
 *   - sidebar.brand.name          "DataOps" wordmark
 *   - conversation.hero.brand.mark  infinity mark on the empty-session hero
 *
 * Do not mount @deepseek-ai/dsh-client-ui-brand-official next to this package:
 * all three are single-occupant slots.
 */
export function apply(ctx) {
  if (typeof document !== 'undefined') Brand.installStyles(document)
  var slots = ctx.slots
  if (slots === undefined) return
  slots.inject('sidebar.brand.mark', function () {
    return slots.register({ name: 'sidebar.brand.mark' }, Brand.Mark)
  })
  slots.inject('sidebar.brand.name', function () {
    return slots.register({ name: 'sidebar.brand.name' }, Brand.Name)
  })
  slots.inject('conversation.hero.brand.mark', function () {
    return slots.register({ name: 'conversation.hero.brand.mark' }, Brand.HeroMark)
  })
}

exports.apply = apply
exports.inject = ['slots']
