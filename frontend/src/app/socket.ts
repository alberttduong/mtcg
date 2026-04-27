class Socket {
	socket: WebSocket | null
	listening: any
	onOpen: any
	lobby?: number
	callbacks: {
		[eventName: string]: any
	}

	static s: Socket | null

	static instance(): Socket {
		if (this.s == null) {
			const s = new Socket()
			this.s = s
			return s
		} else {
			return this.s
		}
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
