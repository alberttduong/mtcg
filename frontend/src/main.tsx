import { StrictMode } from "react"
import ReactDOM from "react-dom/client"
import { Provider } from "react-redux"
import { DeckEditor } from "@/features/deck/DeckEditor"
import { Game } from "@/features/game/Game"
import { Home } from "@/features/home/Home"
import { store } from "./app/store"
import "./index.css"
import { CenterCol } from "@/styles"
import { BrowserRouter, Routes, Route } from "react-router"
import Rules from "./features/home/Rules"
import { App } from "./app-wrapper"

const root = document.getElementById("root")

if (root) {
	ReactDOM.createRoot(root).render(
		<BrowserRouter><StrictMode>
		<Provider store={store}>
			<App className={CenterCol}>
				<Routes>
					<Route path="/deck" element={<DeckEditor/>} />
					<Route path="/" element={<Home/>} />
					<Route path="/game" element={<Game/>} />
					<Route path="/rules" element={<Rules/>} />
				</Routes>
			</App>
		</Provider>
		</StrictMode></BrowserRouter>
	)
} else {
	throw new Error("Root element with ID 'root' was not found in the document. Ensure there is a corresponding HTML element with the ID 'root' in your HTML file.",)
}
