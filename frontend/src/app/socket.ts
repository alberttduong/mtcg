class Socket {
	socket: WebSocket | null
	listening: any
	onOpen: any
	lobby?: number
	callbacks: {
		[eventName: string]: any
	}

  constructor() {
    this.socket = null
	this.callbacks = {}
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

	on(eventName: string, callback: any, callbackName?: string) {
		if (!this.socket) {
			console.log('ERROR: listening before opening socket')
			return
		}

		this.socket.addEventListener(eventName, callback)
		if (callbackName) {
			this.socket.removeEventListener(eventName, this.callbacks[callbackName])
			this.callbacks[eventName] = callback
		}
	}
}

export { Socket }
