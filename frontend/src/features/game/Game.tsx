import type { JSX } from "react"
import { useState, useEffect } from "react"
import { 
	useAppDispatch, 
} from "../../app/store"
import type { Body, Msg, Response } from "@/app/middleware"
import { 
	connected,
	socketListener,
	socketOn,
	send,
} from "../../app/middleware"
import { 
	GameComponent,
	animation,
} from "./GameComponent"
import {
	Chat
} from "./Lobby"
import {
	Popup
} from "@/features/component/popup"

export interface Card {
	name: string
	hp: number
	atk: number
}

export interface GameState {
	turn?: number
	numPlayers?: number 
	playerNumber?: number 
	player0hand?: string[]
	player1hand?: string[]
	player0board?: Card[][]
	player1board?: Card[][]
}

interface Animation {
	name: string,
	player: number 
}

interface GameStateUpdate {
	anim?: Animation
	newState: GameState
}

export const Game = (): JSX.Element => {
	const dispatch = useAppDispatch()
	const [state, setState] = useState<GameState>({})
	const [msg, setMsg] = useState("")
	const [body, setBody] = useState("{}")
	const [started, setStarted] = useState(false)
	const [lobby, setLobby] = useState(-1)
	const [chat, setChat] = useState<string[]>(["hi", "yo"])
	const [lobbyList, setLobbyList] = useState("")
	const [popupOpen, setPopupOpen] = useState(false)
	const [popupText, setPopupText] = useState("")

	function newPopup(text: string) {
		setPopupText(text)
		setPopupOpen(true)
	}

	const sendMsg = (msg: string, body?: Body) => {
		const newMsg: Msg = {Msg: msg, Body: body || {}}
		dispatch(send(newMsg))
	}

	async function updateGame(u: GameStateUpdate) {
		const newState = {...state}

		if (u.anim && u.anim.name == "draw") {
			await animation.drawCard(u.anim.player)
		}

		const update = u.newState
		for (const [k, v] of Object.entries(update)) {
			const key = k as keyof GameState 
			newState[key] = v
		}

		setState(newState)
	}

	useEffect(() => {
		dispatch(connected())

		socketOn('open', () => {
			//sendMsg("create lobby")
			//sendMsg("start game")
		})
	}, [])

	useEffect(() => {
		socketListener((e: any) => {
			const res: Response = JSON.parse(e.data)
			if (res.StatusCode == 400) {
				newPopup("Error: " + res.Body.error)
			}

			if (res.StatusCode != 200 && res.StatusCode != 0) {
				console.log(`Got err code ${res.StatusCode} from server: ${res.Body.error}`)
				return
			}

			switch (res.Msg) {
			case "chat newmsg":
				setChat(
					[
						...chat, 
						res.Body.msg
					]
				)
				break
			case "create lobby":
				setLobby(res.Body.lobbyId)
				break
			case "get lobby":
				setLobbyList(res.Body.lobbyList)
				break
			case "join lobby":
				setLobby(res.Body.lobbyId)
				break
			case "start game":
				if (res.StatusCode != 0)
					break	

				const s: GameState = res.Body.state
				setStarted(true)
				setState(s)
				break
			case "leave lobby":
				if (res.StatusCode == 200) {
					setLobby(-1)
				}
				break
			case "update game":
				const updates = res.Body.updates
				updates.forEach((u: GameStateUpdate) => {
					updateGame(u)
				})
				break
			default:
				if (res.StatusCode == 0)
					console.log(`unrecognized msg in server response: ${res.Msg}`)
			}
		})
	}, [state, chat])

	function createLobby() {
		dispatch(send({Msg: "create lobby", Body: {}}))
	}

	function leaveLobby() {
		sendMsg("leave lobby", {lobbyId: 1})
	}

	function joinLobby() {
		sendMsg("join lobby", {lobbyId: 1})
	}

	function startGame() {
		sendMsg("start game")
	}

	return <div>
		<Popup 
			isOpen={popupOpen} setIsOpen={setPopupOpen}
			text={popupText}
			/>
		<div className="bg-gray-100">
		<label>Your Lobby: {lobby > 0 ? lobby : "None"}</label>
		<div>{lobbyList}</div>
		</div>
		<div className="flex">
			{lobby > 0 && <div className="flex-col">
				<div className="flex flex-row">
					<button onClick={leaveLobby}>Leave Lobby</button>
					<button onClick={startGame}>Start game</button>
				</div>
				<Chat chat={chat} sendChat={(msg: string) => {
					sendMsg("chat send", {msg: msg})
				}}/>
			</div> || <>
				<button onClick={createLobby}>Create Lobby</button>
				<button onClick={joinLobby}>Join Lobby</button>
			</>}
		</div>

		{started && <GameComponent state={state} sendMsg={sendMsg}/>}
		{state.player0board?.map((a) => {
			return a?.map((b) => {
				return b.name
			})
		})}

		<div className="flex">
			<input type="text"
				value={msg}
				onChange={(e) => {
					setMsg(e.target.value)
				}
			}/>
			<input type="text"
				value={body}
				onChange={(e) => {
					setBody(e.target.value)
				}
			}/>
			<button
				aria-label="Send"
				onClick={() => {
					const bodyObject = JSON.parse(body)
					dispatch(send({Msg: msg, Body: bodyObject}))
				}
			}>
			+
			</button>
		</div>
	</div>
}
