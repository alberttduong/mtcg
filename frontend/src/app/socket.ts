class Socket {
  socket: WebSocket | null
  listening: any

  constructor() {
    this.socket = null
  }

  connect(url: string) {
    if (!this.socket) {
      this.socket = new WebSocket(url)
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  send(message: any) {
    if (this.socket) {
      this.socket.send(JSON.stringify(message))
    }
  }

  on(eventName: string, callback: any) {
    if (this.socket) {
	  this.socket.removeEventListener(eventName, this.listening)
      this.socket.addEventListener(eventName, callback)
	  this.listening = callback
    }
  }
}

export { Socket }
