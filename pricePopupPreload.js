const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld("api", {
  on(eventName, callback) {
    ipcRenderer.on(eventName, callback)
  },
  send(eventName) {
    ipcRenderer.send(eventName)
  }
})