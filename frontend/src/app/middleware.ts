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

export type SendMsg = (msg: string, body?: Body) => void

const DEV = process.env.NODE_ENV === 'development'
const api_url = DEV ? 'localhost:8080' : 'mtcg-api.albertduong.com'
const ws_url = `ws${DEV ? '' : 's'}://${api_url}/ws`
export const API_URL = `http${DEV ? '' : 's'}://${api_url}`

const listenerMiddleware = createListenerMiddleware()

const connected = createAction<undefined>('connected')
const send = createAction<Msg>('send')

listenerMiddleware.startListening({
	actionCreator: connected,
	effect: async () => { 
		Socket.instance().connect(ws_url)
	}
})

export async function ConnectWS() {
	return new Promise(resolve => {
		Socket.instance().connect(ws_url)

		Socket.instance().on('open', () => {
			//console.log('Connected')
			resolve(0)
		})

		Socket.instance().on('message', (e: any) => {
			console.log(`Got ${e.data}`)
		})
	} )
}


listenerMiddleware.startListening({
	actionCreator: send,
	effect: async (action) => { 
		console.log(`socket sending ${action.payload.Msg}`)
		Socket.instance().send(action.payload)
	}
})

function socketListener(callback: any, callbackName?: string) {
	Socket.instance().on('message', callback, callbackName)
}

export function useSendMsg(dispatch: any) {
	return (msg: string, body?: Body) => {
		const newMsg: Msg = {Msg: msg, Body: body || {}}
		dispatch(send(newMsg))
	}
}

/*
export async function getStatusCode(msg: string): Promise<number> {
	Socket.on('message', (e: any) => {
		const res: Response = JSON.parse(e.data)
		if (res.Msg == msg) {
			return res.StatusCode
		}
	})
	return 0
}

function socketOn(event: string, callback: any) {
	socket.on(event, callback)
}
*/

export { socketListener }
export { listenerMiddleware }
export { connected, send }
