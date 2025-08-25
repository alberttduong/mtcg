import type { JSX } from "react"
import { Link } from "react-router"
import { useState, useEffect, useRef } from "react"
import { LobbyMenu } from "@/features/game/LobbyMenu"

import { 
	useAppDispatch, 
} from "../../app/store"
import { 
	send,
} from "../../app/middleware"

export const Home = (): JSX.Element => {
	const dispatch = useAppDispatch()
	const sendMsg = (msg: string, body?: any) => {
		dispatch(send({Msg: msg, Body: body}))
	}

	return <div className="flex flex-col items-center">
		<h1>Beach Wars</h1>
		<h1>Multiplayer TCG</h1>
		<div className="flex gap-3 items-center justify-center w-lg">
			<div className="flex flex-col items-center justify-center w-[50%]">
				<h2>Current Deck: None</h2>
				<Link to="/deck">
					<button>Deck Builder</button>
				</Link>
			</div>
			<div className="w-[50%]">
				<LobbyMenu sendMsg={sendMsg}/>
			</div>
		</div>
		<div className="fixed top-10 left-10">
			Logged in as Username
			<button>Logout</button>
		</div>
		<Link to="/" className="fixed right-10 bottom-10">More info</Link>
	</div>
}
