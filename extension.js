const ports = new Map()
browser.runtime.onConnect.addListener(async port => {
  ports.set(port.name, port)
  console.log(port.name)
  const rules = await browser.storage.sync.get({rules: ''})
  port.postMessage(rules)
  port.onDisconnect.addListener(() => ports.delete(port.name))
})

browser.storage.onChanged.addListener(({rules = ''}, areaName) => {
  if (areaName != 'sync') {
    return
  }
  for (const port of ports.values()) {
    port.postMessage(rules)
  }
})
