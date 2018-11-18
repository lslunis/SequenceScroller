'use strict'

let [backward = -1, forward = 1] = []
let regionDirection
let lastScrolled = -Infinity
let pageUrls = {}

function updateRegion() {
  let html = document.documentElement
  let top = 0
  let {clientHeight} =
    document.compatMode == 'CSS1Compat' ? html : document.body
  let bottom = html.scrollHeight - clientHeight
  // Instead of comparing exactly, we check < 1 to accomodate subpixel scrolling
  let region = [top, bottom].find(y => Math.abs(y - pageYOffset) < 1)
  regionDirection = {[top]: backward, [bottom]: forward}[region]
}

function scrollOrNavigate(direction) {
  let now = performance.now()
  let delta = now - lastScrolled
  lastScrolled = now

  // We wait for scrollCooldown to elapse before a scroll
  // is allowed to be interpreted as a navigation
  let scrollCooldown = 300
  if (regionDirection != direction || delta < scrollCooldown) {
    return
  }

  let url = pageUrls[direction]
  if (url) {
    location = url
  }
}

function parsePathRule(pathRule) {
  let valid = true
  let padding
  pathRule = pathRule.replace(/#+/g, s => {
    if (padding) {
      console.log(`ignoring rule with multiple page placeholders: ${pathRule}`)
      valid = false
    }
    padding = s.length
    return `)(\\d{${padding},})(`
  })
  if (!valid) {
    return {}
  }

  let pattern
  let i = pathRule.indexOf('?')
  if (i >= 0) {
    pattern = `(^${pathRule}[^?]*\\?(?:.*&)?${queryRule}(?:&.*)?$)`
  } else {
    pattern = `(^${pathRule}.*)`
  }
  return {pattern: new RegExp(pattern), padding}
}

function applyRules(rules) {
  let prevUrls = new Set()
  let nextUrls = new Set()

  let interpreters = [
    [
      /(.*)\{([^,]+),([^}]+)\}(.*)/,
      ([prefix, prev, next, suffix]) => {
        let addUrls = (urls, infix) => {
          let nodes = document.querySelectorAll(prefix + infix + suffix)
          for (let node of nodes) {
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
        let {host, pathname, search} = location
        let path = pathname + search
        let i = host.length - expectedAuthority.length
        let subdomain = host.slice(0, i)
        let authorityMatched =
          (!subdomain || subdomain.endsWith('.')) &&
          host.slice(i) == expectedAuthority
        if (!authorityMatched) {
          return
        }

        let {pattern, padding} = parsePathRule(pathRule)
        if (!pattern) {
          return
        }
        path.replace(pattern, (_, prefix, page, suffix) => {
          let maybeAddUrl = (urls, offset) => {
            let newPage = +page + offset
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

  for (let rule of rules) {
    for (let [pattern, applyRule] of interpreters) {
      let match = rule.match(pattern)
      if (match) {
        applyRule(match.slice(1))
        break
      }
    }
  }

  let getUrl = (name, urls) => {
    urls = [...urls]
    console.log(`${name}: ${JSON.stringify(urls)}`)
    return urls.length ? urls[0] : null
  }
  pageUrls[backward] = getUrl('prevUrls', prevUrls)
  pageUrls[forward] = getUrl('nextUrls', nextUrls)
}

addEventListener('scroll', updateRegion, {passive: true})

addEventListener('keydown', e => {
  let key = e.which
  let [pageUp = 33, pageDown = 34] = []
  if (key == pageUp) {
    scrollOrNavigate(backward)
  } else if (key == pageDown) {
    scrollOrNavigate(forward)
  }
})

updateRegion()
addEventListener('load', updateRegion)

let port = chrome.runtime.connect(
  null,
  {name: '' + Math.random()},
)
port.onMessage.addListener(applyRules)
