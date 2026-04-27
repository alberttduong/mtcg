import * as toolkitRaw from '@reduxjs/toolkit';
const { createSlice } = ((toolkitRaw as any).default ?? toolkitRaw) as typeof toolkitRaw;

import { configureStore } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { listenerMiddleware } from "./middleware"
import { type DeckData } from "@/features/deck/DeckEditor"
import { GameState } from "@/features/game/Game"

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
	isLeader?: boolean
	username?: string
	nickname?: string
	selectedDeck?: string
	deckData?: DeckData
	chat: string[]
	gameState?: GameState
	lobbyReady: {[name: string]: boolean}
}

const initialStore: storeType = {
	loggedIn: false,
	lobbies: {},
	lobbyId: -1,
	chat: [],
	lobbyReady: {},
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

		setDeckData: (state, action) => {
			state.deckData = action.payload
		},

		joinLobby: (state, action) => {
			state.lobbyId = action.payload
		},

		setIsLeader: (state, action) => {
			state.isLeader = action.payload
		},

		setLobbies: (state, action) => {
			state.lobbies = action.payload
		},

		setNickname: (state, action) => {
			state.nickname = action.payload
		},

		updateLobby: (state, action) => {
			const body = action.payload
			if (body.deleted) {
				delete state.lobbies[body.id]
			} else {
				state.lobbies[body.id] = {
					id: body.id,
					members: body.members,
				}
			}
		},

		// Shows that any player in your lobby has selected their deck 
		// and is ready to start the game
		//
		// Player is ready, no deck information TODO
		setDeck: (state, action) => {
			const body = action.payload
			if (!body.name || body.ready === undefined) {
				throw "Setdeck body is missing 'name' and 'ready'"
			}
			state.lobbyReady[body.name] = body.ready
		},

		// Shows that you have selected a valid deck and ready to start
		// the game
		confirmSelectedDeck: (state, action) => {
			state.selectedDeck = action.payload
		},

		addToChat: (state, action) => {
			state.chat.push(`[${action.payload.name}] ${action.payload.msg}`)
		},

		setGameState: (state, action) => {
			state.gameState = action.payload
		},
		
		setGameNames: (state, action) => {
			if (state.gameState) {
				state.gameState.names = action.payload
			}
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
	setIsLeader,
	setDeck,
	addToChat,
	confirmSelectedDeck,
	updateLobby,
	setNickname,
	setDeckData,	
	setGameState,
	setGameNames,
} = storeReducer.actions

export const selectNickname = (state: storeType) => state.nickname
export const selectDeckData = (state: storeType) => state.deckData
export const selectIsLeader = (state: storeType) => state.isLeader
export const selectLoggedIn = (state: storeType) => state.loggedIn
export const selectLobbyId = (state: storeType) => state.lobbyId
export const selectUsername = (state: storeType) => state.username
export const selectLobbies = (state: storeType) => state.lobbies
export const selectConfirmedDeck = (state: storeType) => state.selectedDeck
export const selectChat = (state: storeType) => state.chat
export const selectGameState = (state: storeType) => state.gameState
export const selectLobbyReady = (state: storeType) => state.lobbyReady
