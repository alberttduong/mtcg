import * as toolkitRaw from '@reduxjs/toolkit';
const { createSlice } = ((toolkitRaw as any).default ?? toolkitRaw) as typeof toolkitRaw;

import { configureStore } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { listenerMiddleware } from "./middleware"

export interface Member {
	name: string
	isLeader?: boolean
	ready?: boolean
}

export interface Lobby {
	id: number
	members: Member[]
}

export interface Lobbies {
	[id: string]: Lobby
}


export type storeType = {
	loggedIn: boolean
	lobbyId: number
	lobbies: Lobbies
	username?: string
	selectedDeck?: string
	chat: string[]
}

const initialStore: storeType = {
	loggedIn: false,
	lobbies: {},
	lobbyId: -1,
	chat: [],
}

export type Credentials = {
	name?: string
	password?: string
	token?: string
}

const storeReducer = createSlice({
	name: 'store',
	initialState: initialStore,
	reducers: {
		logout: (state) => {
			state.loggedIn = false
			state.username = undefined
			localStorage.removeItem('username')
			localStorage.removeItem('token')
		},

		loginAsUser: (state, action) => {
			state.username = action.payload
			if (state.username) {
				state.loggedIn = true
				localStorage.setItem('username', state.username)
			}
		},

		joinLobby: (state, action) => {
			state.lobbyId = action.payload
		},

		setLobbies: (state, action) => {
			state.lobbies = action.payload
		},

		updateLobby: (state, action) => {
			const body = action.payload
			if (body.deleted) {
				delete state.lobbies[body.id]
			} else {
				state.lobbies[body.id] = {
					id: body.id,
					members: body.members
				}
			}
		},

		// Shows that any player in your lobby has selected their deck 
		// and is ready to start the game
		setDeck: (state, action) => {
			const body = action.payload
			if (!body.name || body.ready == undefined) {
				throw "Setdeck body is missing 'name' and 'ready'"
			}
			state.lobbies[state.lobbyId].members.map((m) => {
				if (m.name == body.name) {
					m.ready = body.ready
				}
			})
		},

		// Shows that you have selected a valid deck and ready to start
		// the game
		confirmSelectedDeck: (state, action) => {
			state.selectedDeck = action.payload
		},

		addToChat: (state, action) => {
			state.chat.push(action.payload)
		},
	}
})

export function loginWithToken(onSuccessDispatch: (username: string) => void) {
	const name = localStorage.getItem('username')
	const token = localStorage.getItem('token')

	if (name && token) {
		onSuccessDispatch(name)
	}
}

const store = configureStore({
	reducer: storeReducer.reducer,
	middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(listenerMiddleware.middleware)
})

export type AppDispatch = typeof store.dispatch
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()

export { store }
export const { 
	logout,
	loginAsUser,
	joinLobby,
	setLobbies,
	setDeck,
	addToChat,
	confirmSelectedDeck,
	updateLobby,
} = storeReducer.actions

export const selectLoggedIn = (state: storeType) => state.loggedIn
export const selectLobbyId = (state: storeType) => state.lobbyId
export const selectUsername = (state: storeType) => state.username
export const selectLobbies = (state: storeType) => state.lobbies
export const selectConfirmedDeck = (state: storeType) => state.selectedDeck
export const selectChat = (state: storeType) => state.chat
