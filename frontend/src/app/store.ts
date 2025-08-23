import * as toolkitRaw from '@reduxjs/toolkit';
const { createAction, createSlice } = ((toolkitRaw as any).default ?? toolkitRaw) as typeof toolkitRaw;

import { configureStore, createReducer } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { listenerMiddleware } from "./middleware"

//const loginFail = createAction<undefined>('login_success')

export type storeType = {
	loggedIn: boolean
}

const initialState: storeType = {
	loggedIn: false
}

const initialStore: storeType = {
	loggedIn: false
}

type Credentials = {
	username: string
}

const storeReducer = createSlice({
	name: 'store',
	initialState: initialStore,
	reducers: {
		logout: (state) => {
			state.loggedIn = false
			localStorage.removeItem('token')
		},
		login: (state, action) => {
			// credentials in payload to login
			// or if already has token

			// send credentials from payload to server
			// get token, if token was sent change state
			state.loggedIn = true
			const creds: Credentials|undefined = action.payload
			if (creds) {
				// request token
				if (creds.username == "Bill") {
					console.log('login success, updated state')
					localStorage.setItem('token', 'token')
				} else {
					console.log('credentials failed')
				}
			} else if (localStorage.getItem('token')) {
				console.log('using token to login')
			} else {
				state.loggedIn = false
			}
		}
	}
})

const store = configureStore({
	reducer: storeReducer.reducer,
	middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(listenerMiddleware.middleware)
})

export type AppDispatch = typeof store.dispatch
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()

export { store }
export const { logout, login } = storeReducer.actions
export const selectLoggedIn = (state: storeType) => state.loggedIn
