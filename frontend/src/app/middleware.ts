import * as toolkitRaw from '@reduxjs/toolkit';
const {  createListenerMiddleware, createAction } = ((toolkitRaw as any).default ?? toolkitRaw) as typeof toolkitRaw;

import { Socket } from "./socket"

export type Body = {
	[key: string]: any
}

export type Msg = {
	Msg: string | null,
	Body: {
		[key: string]: any
	}
}

export type Response = {
	StatusCode: number,
	Msg: string | null,
	Body: {
		[key: string]: any
	}
}

const listenerMiddleware = createListenerMiddleware()
let socket = new Socket()

const connected = createAction<undefined>('connected')
const send = createAction<Msg>('send')

listenerMiddleware.startListening({
	actionCreator: connected,
	effect: async () => { 
		socket.connect('ws://localhost:8080/ws')

		socket.on('open', () => {
			const msg = {Msg: "Hello there", Body: {}}
			socket.send(msg)
			console.log('Connected')
		})

		socket.on('message', (e: any) => {
			console.log(`got ${e.data}`)
		})
	}
})

listenerMiddleware.startListening({
	actionCreator: send,
	effect: async (action) => { 
		console.log(`socket sending ${action.payload.Msg}`)
		socket.send(action.payload)
	}
})

function socketListener(callback: any) {
	socket.on('message', callback)
}

function socketOn(event: string, callback: any) {
	socket.on(event, callback)
}

export { socketListener, socketOn }
export { listenerMiddleware }
export { connected, send }
