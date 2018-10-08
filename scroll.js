'use strict'

let region
let lastScrolled = -Infinity

function updateRegion() {
  const html = document.documentElement
  const bottom = html.scrollHeight - html.clientHeight
  const rawRegion = [0, bottom].findIndex(y => Math.abs(y - pageYOffset) < 1)
  region = {0: -1, 1: 1, [-1]: 0}[rawRegion]
}

function scrollOrNavigate(step) {
  const now = performance.now()
  const delta = now - lastScrolled
  lastScrolled = now

  // We wait for scrollCooldown to elapse before a scroll
  // is allowed to be interpreted as a navigation
  const scrollCooldown = 300
  if (region != step || delta < scrollCooldown) {
    return
  }

  let $ = (selectorTemplate, prev, next) =>
    document.querySelector(
      selectorTemplate.replace(/DIR/, step < 0 ? prev : next),
    )
  let link =
    $('[rel=DIR]', 'prev', 'next') ||
    $('.bottom_nav p:DIR-of-type a', 'first', 'last') ||
    $('.b-pager-DIR', 'prev', 'next')
  if (link) {
    console.log('link')
    location = link.href
  } else {
    console.log('no link')
    let m = location.pathname.match(/(.*\/)(\d{1,4})([./].*|$)/)
    if (m) {
      let i = +m[2] + step
      if (0 <= i && i < 1e4) {
        console.log(m[1] + i + m[3])
        location = m[1] + i + m[3]
      }
    }
  }
}

function applyRules(rules) {}

addEventListener('scroll', updateRegion, {passive: true})

addEventListener('keydown', e => {
  const key = e.which
  const [pageUp = 33, pageDown = 34] = []
  if (key == pageUp) {
    scrollOrNavigate(-1)
  } else if (key == pageDown) {
    scrollOrNavigate(1)
  }
})

updateRegion()

const port = chrome.runtime.connect(
  null,
  {name: '' + Math.random()},
)
port.onMessage.addListener(applyRules)
