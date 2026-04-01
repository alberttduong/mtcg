import type { JSX } from "react"
import { DeckMenu } from "../counter/DeckMenu"
import { useSelector } from "react-redux"
import { useState, useEffect, useRef } from "react"
import { 
	selectLobbyId,
	useAppDispatch, 
	joinLobby,
} from "../../app/store"
import type { Body, Msg, Response } from "@/app/middleware"
import { 
	connected,
	socketListener,
	send,
} from "../../app/middleware"
import { 
	GameComponent,
	animation,
	CardHovered,
	getAllPlayers,
} from "./GameComponent"
import {
	Lobby
} from "./Lobby"
import {
	Popup,
	usePopup,
} from "@/features/component/popup"
import { default as axios } from "axios"
import { Cards } from "@/features/counter/Counter"
import { type DeckOption } from "@/features/counter/DeckMenu"
import { CardInfo } from "@/features/counter/CardInfo"

export interface Card {
	name: string
	hp: number
	atk: number
}

export interface GameState {
	turn: number
	numPlayers?: number 
	playerNumber: number 

	player0hand: string[]
	player0board: Card[][]
	player0deck: number

	player1hand: string[]
	player1board: Card[][]
	player1deck: number

	player2hand: string[]
	player2board: Card[][]
	player2deck: number

	player3hand: string[]
	player3board: Card[][]
	player3deck: number

	mana: number
}

function newGameState(): GameState {
	let board: Card[][] = []
	return {
		playerNumber: 0,

		player0hand: [],
		player0board: board,
		player0deck: 0,

		player1hand: [],
		player1board: board,
		player1deck: 0,

		player2hand: [],
		player2board: board,
		player2deck: 0,

		player3hand: [],
		player3board: board,
		player3deck: 0,

		turn: 0,
		mana: 0,
	}
}

interface Animation {
	name: string,
	player?: number 
	pos1: number[] | undefined
	pos2: number[] | undefined
}

interface GameStateUpdate {
	anim?: Animation
	newState: GameState
}

function playerToBoard(player: number, state: GameState)
: Card[][] | undefined {
	return getAllPlayers(state)[player].board
}

function CardView(props: any) {
	const card: CardHovered = props.cardHovered
	const cards: Cards = props.cards
	const state: GameState = props.state
	let boardCard: Card | undefined = undefined
	if (card && card.location == "board" 
		&& card.row !== undefined
		&& card.col !== undefined) {
		const board = playerToBoard(card.player, state)
		if (board ) {
			const c = board[card.row][card.col]
			if (c.name) {
				boardCard = c
			}
		}
	}


	return <div className="w-[250px] h-[200px] fixed left-0 bottom-0 bg-gray-100">
		{card && card.location == "hand" &&
			<CardInfo name={card.name} info={cards[card.name]}/>
		}
		{card && card.location == "board" && boardCard && <>
			<h1>{boardCard.name} (Player {card.player})</h1>
			<h1>HP {boardCard.hp}</h1>
			<h1>ATK {boardCard.atk || "0"}</h1>
			<br/>
			<h1>@r{card.row}c{card.col}</h1>
		</>}
	</div>
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export const Game = (): JSX.Element => {
	const dispatch = useAppDispatch()
	const lobby = useSelector(selectLobbyId)

	const setLobby = (lob: number) => {
		dispatch(joinLobby(lob))
	}

	const [state, setState] = useState<GameState>(newGameState())
	const [started, setStarted] = useState(false)
	//const [lobby, setLobby] = useState(-1)
	const [chat, setChat] = useState<string[]>([])

	const [newPopup, closePopup, popupText] = usePopup()

	const [cardHovered, setCardHovered] = useState<CardHovered>()

	const [deck, setDeck] = useState<DeckOption>({data: {}})

	let cards = useRef<Cards>({})

	const sendMsg = (msg: string, body?: Body) => {
		const newMsg: Msg = {Msg: msg, Body: body || {}}
		dispatch(send(newMsg))
	}

	async function updateGame(u: GameStateUpdate, 
							  newState: GameState) {

		if (u.anim) {
			await sleep(1)
			switch (u.anim.name) {
			case "draw":
				break
			case "attack":
				if (u.anim.pos1 && u.anim.pos2) {
					await animation.attack(u.anim.pos1, u.anim.pos2)
					await sleep(1)
					await animation.takeDamage(u.anim.pos2)
				} else {
					console.log("error in attack")
				}
				break
			case "death":
				if (u.anim.pos1) {
					await animation.die(u.anim.pos1)
				}
				break
			case "gain mana":
				console.log('got mana')
				break
			case "win":
				newPopup("Player " + u.anim.player + " won the game")
				break
			default:
				console.log("no animation for " + u.anim) 
			}
		}

		const update = u.newState
		for (const [k, v] of Object.entries(update)) {
			const key = k as keyof GameState 
			newState[key] = v
		}

		return newState
	}

	useEffect(() => {
		dispatch(connected())

		axios.get('http://localhost:8080/cards')
		.then((res) => {
			cards.current = res.data
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
			case "start game":
				if (res.StatusCode != 0)
					break	

				console.log('starting game')
				const s: GameState = res.Body.state
				setStarted(true)
				setState(s)
				break
			case "leave lobby":
				if (res.StatusCode == 200) {
					setLobby(-1)
					setStarted(false)
				}
				break
			case "update game":
				const updates = res.Body.updates
				//console.log(JSON.stringify(updates))

				let newState = {...state}
				const update = async () => {
					for (const u of updates) {
						newState = await updateGame(u, newState)
					}
					setState(newState)
				}
				update()
				break
			}
		}, 'game')
	}, [state, chat])

	return <div>
		<Popup closePopup={closePopup} text={popupText}/>

		<Lobby
			className="z-4 fixed top-0 left-0"
			newPopup={newPopup}
			lobby={lobby}
			chat={chat}
			sendMsg={sendMsg} />

		{!started && <DeckMenu deck={deck} setDeck={setDeck} sendMsg={sendMsg}/>}

		<CardView 
			state={state}
			cards={cards.current}
			cardHovered={cardHovered}/>

		{started &&
		<GameComponent 
			setCardHovered={setCardHovered}
			className="fixed right-0" 
			game={state} sendMsg={sendMsg}/>}


	</div>
}
