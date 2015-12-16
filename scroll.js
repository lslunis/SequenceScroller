'use strict'

let last = {t: 0, y: 0}

function nav(step) {
    let html = document.documentElement
    let bound = (html.scrollHeight - html.clientHeight) / 2 * (1 + step)
    if ((performance.now() - last.t) < 300 || step * last.y < bound) return

    let dir = step < 0 ? 'prev' : 'next'
    let link = document.querySelector(`[rel=${dir}]`)
    if (link) location = link.href
    else {
        let m = location.pathname.match(/(.*\/)(\d{1,4})([./].*|$)/)
        if (m) {
            let i = +m[2] + step
            if (0 <= i && i < 1e4) location = m[1] + i + m[3]
        }
    }
}

addEventListener('scroll', e => {
    let y = pageYOffset
    if (y != last.y) last = {t: e.timeStamp, y}
})

addEventListener('keydown', e => {
    let k = e.which
    if (k == 32 && e.shiftKey || k == 33) nav(-1)
    else if (k == 32 || k == 34) nav(1)
})

addEventListener('wheel', e => {
    let y = e.deltaY
    if (y) nav(y / Math.abs(y))
})
