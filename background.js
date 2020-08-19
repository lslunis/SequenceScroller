async function getRules() {
  let {rules} = await browser.storage.sync.get({rules: []})
  return rules
}

let setRules = (rules) => browser.storage.sync.set({rules})

let ports = new Map()
browser.runtime.onConnect.addListener(async (port) => {
  ports.set(port.name, port)
  port.onDisconnect.addListener(() => ports.delete(port.name))

  port.postMessage(await getRules())
})

browser.storage.onChanged.addListener(({rules}, area) => {
  if (!rules || area != 'sync') {
    return
  }

  for (let port of ports.values()) {
    port.postMessage(rules.newValue)
  }
})

let listRules = async () => console.log(JSON.stringify(await getRules(), null, 2))

async function addRule(rule) {
  rule = rule.replace(/^(?:https?:\/\/)?(?:www\d*\.)?/, '')
  let rules = await getRules()
  if (rules.includes(rule)) {
    console.log('rule already exists')
  } else {
    rules.push(rule)
    await setRules(rules)
  }
  listRules()
}

async function removeRule(rule) {
  let rules = await getRules()
  let i = rules.indexOf(rule)
  if (i >= 0) {
    rules.splice(i, 1)
    await setRules(rules)
  } else {
    console.log('rule not found')
  }
  listRules()
}

;[listRules, setRules, addRule, removeRule].map((f) => {
  window[f.name] = (...args) => {
    f(...args)
  }
})
