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

const api_url = 'mtcg-api.albertduong.com:8080'
export const API_URL = `https://${api_url}`

const listenerMiddleware = createListenerMiddleware()
let socket = new Socket()

const connected = createAction<undefined>('connected')
const send = createAction<Msg>('send')

listenerMiddleware.startListening({
	actionCreator: connected,
	effect: async () => { 
		socket.connect(`ws://${api_url}/ws`)

		/*
		socket.on('open', () => {
			const msg = {Msg: "Hello there", Body: {}}
			socket.send(msg)
			console.log('Connected')
		})
		*/
	}
})

export async function ConnectWS() {
	return new Promise(resolve => {
		socket.connect(`ws://${api_url}/ws`)

		socket.on('open', () => {
			//console.log('Connected')
			resolve(0)
		})

		socket.on('message', (e: any) => {
			console.log(`Got ${e.data}`)
		})
	} )
}


listenerMiddleware.startListening({
	actionCreator: send,
	effect: async (action) => { 
		console.log(`socket sending ${action.payload.Msg}`)
		socket.send(action.payload)
	}
})

function socketListener(callback: any, callbackName?: string) {
	socket.on('message', callback, callbackName)
}

export function useSendMsg(dispatch: any) {
	return (msg: string, body?: Body) => {
		const newMsg: Msg = {Msg: msg, Body: body || {}}
		dispatch(send(newMsg))
	}
}

export async function getStatusCode(msg: string): Promise<number> {
	socket.on('message', (e: any) => {
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


export function receiveLobbyResponse(
	res: Response,
	setLobby: (i: number) => void
) {
	switch (res.Msg) {
	case "create lobby":
		setLobby(res.Body.lobbyId)
		break
	case "join lobby":
		setLobby(res.Body.lobbyId)
		break
	case "leave lobby":
		if (res.StatusCode == 200) {
			setLobby(-1)
		}
		break
	}
}

export { socketListener, socketOn }
export { listenerMiddleware }
export { connected, send }
