import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { Provider } from "react-redux"
import { Counter } from "@/features/counter/Counter"
import { Game } from "@/features/game/Game"
import { store } from "./app/store"
import "./index.css"
import { CenterCol } from "@/styles"
import { BrowserRouter, Routes, Route } from "react-router"

const root = document.getElementById("root")

if (root) {
	ReactDOM.createRoot(root).render(
		<BrowserRouter><StrictMode>
		<Provider store={store}>
			<div className={CenterCol}>
			<Routes>
				<Route path="/deck" element={<Counter />} />
				<Route path="/" element={<Game />} />
			</Routes>
			</div>
		</Provider>
		</StrictMode></BrowserRouter>
	)
} else {
	throw new Error("Root element with ID 'root' was not found in the document. Ensure there is a corresponding HTML element with the ID 'root' in your HTML file.",)
}
