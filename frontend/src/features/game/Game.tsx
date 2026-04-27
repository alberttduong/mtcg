import type { JSX } from "react"
import { DeckSelectionMenu } from "../deck/DeckSelectionMenu"
import { useSelector } from "react-redux"
import { useState, useEffect, useRef } from "react"
import { GameRules } from "@/features/home/Rules"
import { 
	selectChat,
	selectNickname,
	selectGameState,
	useAppDispatch, 
} from "@/app/store"
import type { Body, Msg, Response } from "@/app/middleware"
import { 
	connected,
	socketListener,
	send,
	API_URL
} from "@/app/middleware"
import { 
	GameComponent,
	type CardHovered,
	getAllPlayers,
} from "./GameComponent"
import {
	Chat,
} from "../home/Lobby"
import {
	Popup,
	ConfirmPopup,
	usePopup,
} from "@/features/component/popup"
import { default as axios } from "axios"
import type { Cards } from "@/features/deck/DeckEditor"
import type { DeckOption } from "@/features/deck/DeckSelectionMenu"
import { CardInfo } from "@/features/deck/CardInfo"

export interface Card {
	name: string
	hp: number
	atk: number
}

// Needs to be hardcoded to for JSON encoding
export interface GameState {
	turn: number
	numPlayers?: number 
	playerNumber: number 
	names: string[]

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

	player4hand: string[]
	player4board: Card[][]
	player4deck: number

	mana: number
	maxMana: number
}

function newGameState(): GameState {
	const board: Card[][] = [[], [null, null, {
		name: "Sand Castle",
		hp: 0,
		atk: 0,
	}]]
	return {
		numPlayers: 4,
		names: [
			"Player1",
			"Player2",
			"Player3",
			"Player4",
			"Player5",
		],
		playerNumber: 0,

		player0hand: ["1","1"],
		player0board: board,
		player0deck: 0,

		player1hand: ["2","2"],
		player1board: board,
		player1deck: 0,

		player2hand: ["3","3"],
		player2board: board,
		player2deck: 0,

		player3hand: ["4","4"],
		player3board: board,
		player3deck: 0,

		player4hand: ["5","5"],
		player4board: board,
		player4deck: 0,

		turn: 0,
		mana: 3,
		maxMana: 6,
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

function CardView(props: {cardHovered: CardHovered, cards: Cards, state: GameState}) {
	const card: CardHovered = props.cardHovered
	const cards: Cards = props.cards
	const state: GameState = props.state
	let boardCard: Card | undefined = undefined
	const player = card ? getAllPlayers(state)[card.player] : null
	if (card && card.location === "board" 
		&& card.row !== undefined
		&& card.col !== undefined) {
		const board = playerToBoard(card.player, state)
		if (board[card?.row]) {
			const c = board[card.row][card.col]
			if (c?.name) {
				boardCard = c
			}
		}
	}

	return <div className={`${props.className} h-[200px] fixed left-0 bottom-0 bg-gray-100`}>
		{card && card.location === "hand" &&
			<CardInfo name={card.name} info={cards[card.name]}/>
		}
		{card && card.location === "board" && boardCard && <>
			<p>{boardCard.name} (Player {card.player})</p>
			<p>HP {boardCard.hp}</p>
			{ boardCard.name !== "Sand Castle" && <p>
				ATK {boardCard.atk || "0"}
			</p> || <>
				<p>Cards in deck: {player?.deck}</p>
				<p>Cards in hand: {player?.hand.length}</p>
			</>}
			<p>@r{card.row}c{card.col}</p>
		</>}
	</div>
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export const Game = (): JSX.Element => {
	const dispatch = useAppDispatch()

	const gameState = useSelector(selectGameState)
	const [state, setState] = useState<GameState>(newGameState())
	const [started,] = useState(true)

	const chat = useSelector(selectChat)
	const nickname = useSelector(selectNickname)

	const [newPopup, closePopup, popupText] = usePopup()

	const [cardHovered, setCardHovered] = useState<CardHovered>()

	const [deck, setDeck] = useState<DeckOption>({data: {}})
	const [rules, showRules] = useState<"Game Rules" | "">("")

	const cards = useRef<Cards>({})

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
				newPopup(`Player ${u.anim.player} won the game`)
				break
			default:
				console.log(`no animation for ${u.anim}`) 
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
		axios.get(`${API_URL}/cards`)
		.then((res) => {
			cards.current = res.data
		})
	}, [])

	useEffect(() => {
		socketListener((e: any) => {
			const res: Response = JSON.parse(e.data)
			switch (res.Msg) {
			case "update game": {
				const updates = res.Body.updates

				let newState: GameState = {...state}
				const update = async () => {
					for (const u of updates) {
						newState = await updateGame(u, newState)
					}
					setState(newState)
				}
				update()
				break
				}
			}
		}, 'game')
	}, [state])

	return <div>
		<Popup closePopup={closePopup} text={popupText}/>

		{!started && <DeckSelectionMenu deck={deck} setDeck={setDeck} sendMsg={sendMsg}/>}

		{started &&
		<GameComponent 
			setCardHovered={setCardHovered}
			game={state} sendMsg={sendMsg}/>}
		
		<button type="button" className="absolute top-5 right-5"
			onClick={()=>showRules("Game Rules")}>
			Show Rules
		</button>

		<ConfirmPopup 
			vertical
			OkElement={<GameRules 
				className="w-fit h-[60vh] overflow-scroll pr-2"/>} 
			closePopup={()=>showRules("")} 
			closeText="Close"
			text={rules}/>
		
		<Chat 
			className="absolute left-0 bottom-0 w-[20vw]"
			chat={chat}
			transparent
			toggleable
			sendChat={(msg: string)=>
				sendMsg("chat send", {name: nickname, msg: msg})
			}/>

		<CardView 
			className="w-[10vw] absolute top-5 left-5 p-1"
			state={state}
			cards={cards.current}
			cardHovered={cardHovered}/>
	</div>
}
