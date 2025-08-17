import { configureStore } from '@reduxjs/toolkit'
import { useDispatch } from 'react-redux'
import { listenerMiddleware } from "./middleware"

const store = configureStore({
	reducer: ()=>{},
	middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(listenerMiddleware.middleware)
})

export type AppDispatch = typeof store.dispatch
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()

export default store
