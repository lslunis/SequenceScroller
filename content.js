'use strict'

const [backward = -1, forward = 1] = []
let regionDirection
let lastScrolled = -Infinity
const pageUrls = {}

function updateRegion() {
  const html = document.documentElement
  const top = 0
  const bottom = html.scrollHeight - html.clientHeight
  // Instead of comparing exactly, we check < 1 to accomodate subpixel scrolling
  const region = [top, bottom].find(y => Math.abs(y - pageYOffset) < 1)
  regionDirection = {[top]: backward, [bottom]: forward}[region]
}

function scrollOrNavigate(direction) {
  const now = performance.now()
  const delta = now - lastScrolled
  lastScrolled = now

  // We wait for scrollCooldown to elapse before a scroll
  // is allowed to be interpreted as a navigation
  const scrollCooldown = 300
  if (regionDirection != direction || delta < scrollCooldown) {
    return
  }

  const url = pageUrls[direction]
  if (url) {
    location = url
  }
}

function parsePathRule(pathRule) {
  let valid = true
  let padding
  pathRule = pathRule.replace(/#/g, s => {
    if (padding) {
      console.log(`ignoring rule with multiple page placeholders: ${rule}`)
      valid = false
    }
    padding = s.length
    return `)(\\d{${padding},})(`
  })
  if (!valid) {
    return {}
  }

  let pattern
  const i = pathRule.indexOf('?')
  if (i >= 0) {
    pattern = `(^${pathRule}[^?]*\\?(?:.*&)?${queryRule}(?:&.*)?$)`
  } else {
    pattern = `(^${pathRule}.*)`
  }
  return {pattern: new RegExp(pattern), padding}
}

function applyRules(rules) {
  const prevUrls = new Set()
  const nextUrls = new Set()

  const interpreters = [
    [
      /(.*)\{([^,]+),([^}]+)\}(.*)/,
      ([prefix, prev, next, suffix]) => {
        const addUrls = (urls, infix) => {
          const nodes = document.querySelectorAll(prefix + infix + suffix)
          for (const node of nodes) {
            urls.add(node.href)
          }
        }
        addUrls(prevUrls, prev)
        addUrls(nextUrls, next)
      },
    ],
    [
      /^([^/]+)(\/[^?]+)/,
      ([expectedAuthority, pathRule]) => {
        const {host, pathname, search} = location
        const path = pathname + search
        const i = host.length - expectedAuthority.length
        const subdomain = host.slice(0, i)
        const authorityMatched =
          (!subdomain || subdomain.endsWith('.')) &&
          host.slice(i) == expectedAuthority
        if (!authorityMatched) {
          return
        }

        const {pattern, padding} = parsePathRule(pathRule)
        if (!pattern) {
          return
        }
        path.replace(pattern, (_, prefix, page, suffix) => {
          const maybeAddUrl = (urls, offset) => {
            const newPage = +page + offset
            if (newPage >= 0) {
              urls.add(prefix + ('' + newPage).padStart(padding, 0) + suffix)
            }
          }
          maybeAddUrl(prevUrls, backward)
          maybeAddUrl(nextUrls, forward)
        })
      },
    ],
  ]

  for (const rule of rules) {
    for (const [pattern, applyRule] of interpreters) {
      const match = rule.match(pattern)
      if (match) {
        applyRule(match.slice(1))
        break
      }
    }
  }

  const getUrl = (name, urls) => {
    urls = [...urls]
    console.log(`${name}: ${JSON.stringify(urls)}`)
    return urls.length ? urls[0] : null
  }
  pageUrls[backward] = getUrl('prevUrls', prevUrls)
  pageUrls[forward] = getUrl('nextUrls', nextUrls)
}

addEventListener('scroll', updateRegion, {passive: true})

addEventListener('keydown', e => {
  const key = e.which
  const [pageUp = 33, pageDown = 34] = []
  if (key == pageUp) {
    scrollOrNavigate(backward)
  } else if (key == pageDown) {
    scrollOrNavigate(forward)
  }
})

updateRegion()

const port = chrome.runtime.connect(
  null,
  {name: '' + Math.random()},
)
port.onMessage.addListener(applyRules)
