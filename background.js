async function getRules() {
  const {rules} = await browser.storage.sync.get({rules: []})
  return rules
}

const ports = new Map()
browser.runtime.onConnect.addListener(async port => {
  ports.set(port.name, port)
  port.onDisconnect.addListener(() => ports.delete(port.name))

  port.postMessage(await getRules())
})

browser.storage.onChanged.addListener(({rules}, area) => {
  if (!rules || area != 'sync') {
    return
  }

  for (const port of ports.values()) {
    port.postMessage(rules.newValue)
  }
})

async function listRules() {
  const rules = await getRules()
  console.log('rules:')
  console.log(rules.map(r => JSON.stringify(r)).join('\n'))
}

async function addRule(rule) {
  const rules = await getRules()
  if (rules.includes(rule)) {
    console.log('rule already exists')
  } else {
    rules.push(rule)
    await browser.storage.sync.set({rules})
  }
  listRules()
}

async function removeRule(rule) {
  const rules = await getRules()
  const i = rules.indexOf(rule)
  if (i >= 0) {
    rules.splice(i, 1)
    await browser.storage.sync.set({rules})
  } else {
    console.log('rule not found')
  }
  listRules()
}

;[listRules, addRule, removeRule].map(f => {
  window[f.name] = (...args) => {
    f(...args)
  }
})
