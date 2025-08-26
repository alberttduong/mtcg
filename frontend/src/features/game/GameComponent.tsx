import { GameState } from "./Game"
import { useState, useEffect } from "react"
import { boardCard, handCard, gridCard,
	absCenter,
	absCenterY,
} from "./styles"
import {
	socketListener,
	type Response,
	getStatusCode,
} from "@/app/middleware"
import { motion, animate,
	LayoutGroup,
	AnimatePresence,
	useDragControls,
	useTransform,
	useMotionValue,
    DragControls,
} from "motion/react"
import type {
	Card
} from "./Game"

function getBoardXY(pos: number[]): string[] | null {
	const elm = document.getElementById(`board-${pos[0]}-${pos[1]}-${pos[2]}`)
	if (!elm) return null

	const r = elm.getBoundingClientRect()
	return [Math.trunc(r.left)+"px", Math.trunc(r.top)+"px"]
}

function getElement(pos: number[]) {
	return document.getElementById(`board-${pos[0]}-${pos[1]}-${pos[2]}`)
}

export async function attack(atk: number[], def: number[]) {
	const atkXY = getBoardXY(atk)
	const defXY = getBoardXY(def)
	if (!atkXY || !defXY) return

	const water = document.createElement('div')
	water.className = "w-[50px] h-[50px] bg-blue-400 fixed"
	document.body.appendChild(water)

	await animate(water, {
		left: atkXY[0],
		top: atkXY[1],
	}, {duration: 0})

	await animate(water, {
		rotate: 1260,
		left: defXY[0],
		top: defXY[1],
	}, {duration: 0.4, ease: "easeOut"})

	await animate(water, {
		rotate: 180,
		opacity: 0,
		scale: 0.6
	}, {duration: 0.1, ease: "linear"})
	water.remove()
}

export async function die(pos: number[]) {
	const loc = getElement(pos)
	if (!loc) {
		console.log("error no element die")
		return
	}

	await animate(loc, {
		rotate: -90
	}, {duration: 0.2})
	await animate(loc, {
		opacity: 0
	}, {duration: 0.2})
	return true
}

export async function takeDamage(pos: number[]) {
	const loc = getElement(pos)
	if (!loc) {
		console.log("error no element take dmg")
		return
	}

	const WET_SECS = 0.3

	await animate(loc, {
		backgroundColor: "#FFFFFF"
	}, {duration: 0})
	await animate(loc, {
		backgroundColor: "#C2F4FF",
	}, {duration: WET_SECS, ease: "easeOut"})
	await animate(loc, {
		backgroundColor: "#FFFFFF",
	}, {duration: WET_SECS, ease: "easeIn"})
	return true
}

export const animation = {
	attack: attack,
	die: die,
	takeDamage: takeDamage,
}

function Hands(props: {
	game: GameState, 
	hoverBoard: number[],
	sendMsg: (msg: string, body?: any) => void,
	setCardHovered: (a: CardHovered) => void,
}) {
	const {
		game,
		hoverBoard,
		sendMsg,
		setCardHovered
	} = props

	const players = getAllPlayers(game)
	const opponentHandStyles = [
		absCenter + " top-0", // TOP
		absCenterY + ` left-0 flex-col `, // LEFT
		absCenterY + " right-0 flex-col", // RIGHT 
	]
	const oppCardStyles = [
		"",
		" mr-0 ml-0 -mb-5 -mt-5 ",
		" mr-0 ml-0 -mb-5 -mt-5 ",
	]

	let currentOpponent = -1
	return (<> { players.map((player: Player, i: number) => {
		let handStyle = absCenter + " bottom-0 "
		let cardStyle = ""

		let yourHandProps: {
			onDragEnd?: (i:number)=>void
			setCardHovered?: (a:CardHovered)=>void
		} = {}

		if (player.number != game.playerNumber) {
			currentOpponent += 1
			handStyle = opponentHandStyles[currentOpponent]
			cardStyle = oppCardStyles[currentOpponent]
		} else {
			yourHandProps.onDragEnd = (i: number) => {
				if (hoverBoard[0] != -1 && 
					hoverBoard[1] != -1 &&
					hoverBoard[2] == game.playerNumber) {
					sendMsg("play hand", {
						"index": i,
						"r": hoverBoard[0],
						"c": hoverBoard[1],
					})
				}
			}
			yourHandProps.setCardHovered = setCardHovered
		}
		return <Hand 
				{...yourHandProps}

				className={handStyle}
				cardClassName={cardStyle}
				hand={players[player.number].hand} 
				player={player.number}
				key={i} 
			/>
	})}</>)
}	

function OtherPlayers(props: any) {
	const game: GameState = props.state

	if (game.playerNumber == null) return

	const otherHands = [game.player0hand, game.player1hand]
	const players = [0, 1]

	otherHands.splice(game.playerNumber, 1)
	players.splice(game.playerNumber, 1)

	return <div>
		{players.map((p, i) => {
			return <div 
				id={"deck-"+p} 
				key={i}
				className={boardCard + " absolute left-10 top-10 z-1"}>
				Player{p} Deck
				{game.player1deck}
			</div>
		})
	}
	</div>
}


export interface CardHovered {
	name: string
	player: number
	location: "hand" | "board"
	row?: number
	col?: number
}

interface HandProps {
	hand?: string[],
	player?: number,
	onClick?: (arg0:number) => void,
	onDragEnd?: (arg0:number) => void,
	className?: string,
	cardClassName?: string,
	setCardHovered?: (arg: CardHovered) => void,
}

function Hand(props: HandProps) {
	const {
		hand, 
		player, 
		onDragEnd, 
		className,
		cardClassName,
		setCardHovered,
	} = props;

	return (
	<div 
		id={"hand-"+player} 
		className={className + " flex"}
	>
		{hand && hand.map((card, i) => {
			return (
			<motion.div
				className={handCard + cardClassName} key={i} 
				drag layout dragElastic={0} dragSnapToOrigin
				onDragEnd={() => {if (onDragEnd) {
					onDragEnd(i)
				}}}
				initial={{
					width: 0,
					color: "rgba(0, 0, 0, 0)",
					zIndex: i,
				}}
				animate={{
					width: 60,
					color: "rgba(0, 0, 0, 1)"
				}}
				onMouseEnter={() => {
					if (setCardHovered && player !== undefined) {
						setCardHovered({
							name: card,
							player: player,
							location: "hand",
						})
					}
				}}
				whileHover={{
					y: -4,
					zIndex: 10,
					transition: { duration: 0.2 },
				}}
			>
				{card}
			</motion.div>
			)
		})}
	</div>
	)
}

interface BoardEventsProps {
	className?: string
	setHover: (arg: number[]) => void
	setCardHover: (arg: CardHovered) => void
	selectedBoard: number[]
	setSelectedBoard?: (arg: number[]) => void
	player: number
	selectAttack: number[]
	sendAttack: (defender: number[]) => void
	board: Card[][]
	opponent?: number
}


function GridBoard(props: {
	opponent?: number, 
	className?: string,
	render: (i: number, j: number) => any,
}) {
	const { 
		opponent, 
		className, 
		render,
	} = props

	let columnStyle = " flex flex-col"
	let rowStyle = " flex"
	if (opponent === 0) {
		columnStyle = " flex flex-col-reverse"
		rowStyle = " flex flex-row-reverse"
	}
	if (opponent === 1) {
		columnStyle = " flex flex-row-reverse"
		rowStyle = " flex flex-col"
	}
	if (opponent === 2) {
		columnStyle = " flex flex-row"
		rowStyle = " flex flex-col-reverse"
	}
	return <>
		<div className={className + columnStyle}>
			{[...Array(2)].map((_u, i) => {
				return <div className={rowStyle} key={i}>
					{
						[...Array(5)].map((_u, j) => {
							return render(i, j)
						})
					}
				</div>
			})}
		</div>
	</>
}


function BoardEvents(props: BoardEventsProps) {
	const { 
		className, 
		setHover, 
		setCardHover,
		setSelectedBoard,
		selectAttack,
		sendAttack,
		player,
		board,
		opponent,
		selectedBoard,
	} = props

	return <GridBoard 
		opponent={opponent}
		className={className}
		render={(i, j) => {
			return (<motion.div 
				className={gridCard} key={i*10+j}
				onMouseEnter={ () => {
					setHover([i,j, player])
					setCardHover({
						name: "",
						player: player,
						location: "board",
						row: i,
						col: j,
					})
				}}
				onMouseLeave={ () => {
					setHover([-1,-1,-1])
				}}
				onClick={() => {
					if (setSelectedBoard && board[i][j].name) {
						const thisb = [i,j,player]
						if (selectedBoard.every((v, i) =>
							v == thisb[i]
						)) {
							setSelectedBoard([-1,-1,-1])
						} else {
							setSelectedBoard([i,j,player])
							if (selectAttack[0] != -1) {
								sendAttack([i,j,player])
							}
						}
					}
				}}
			/>)
		}}
	/>
}


interface BoardProps {
	className?: string
	board?: Card[][]
	selectedBoard: number[]
	player: number
	opponent?: number
}

function Board(props: BoardProps) {
	const { className, board, selectedBoard, player, opponent } = props
	return <GridBoard 
		opponent={opponent}
		className={className}
		render={(i, j) => {
			let card
			if (board && board[i] && board[i][j].name) {
				card = board[i][j]
			}

			let style = (selectedBoard && 
				selectedBoard[0] == i &&
				selectedBoard[1] == j &&
				selectedBoard[2] == player) ?
				" bg-yellow-100" : ""

			return <div 
				className={gridCard + style}
				key={j}
				id={`board-${i}-${j}-${player}`}
			>
				{card && <div>
					<div>{card.name}</div>
					<div>
						{card.hp || "0"}
						{card.atk ? "/" + card.atk : ""}
					</div>
				</div>}
			</div>
		}}
	/>
}

interface Player {
	number: number
	board: Card[][]
	hand: string[]
}

interface GameComponentProps {
	game: GameState,
	sendMsg: (msg: string, body?: any) => void,
	setCardHovered: (arg: CardHovered) => void,
	className?: string,
}

export function getAllPlayers(game: GameState): Player[] {
	const p = [
		{
			number: 0,
			hand: game.player0hand,
			board: game.player0board
		}, 
		{
			number: 1,
			hand: game.player1hand,
			board: game.player1board
		},
		{
			number: 2,
			hand: game.player2hand,
			board: game.player2board
		},
		{
			number: 3,
			hand: game.player3hand,
			board: game.player3board
		},
	]
	return p.slice(0, game.numPlayers)
}

export function GameComponent(props: GameComponentProps) {
	const { game, sendMsg, setCardHovered, className } = props
	const [hoverBoard, setHoverBoard] = useState([-1,-1,-1])

	const [selectedBoard, setSelectedBoard] = useState([-1,-1,-1])
	const [selectAttack, setSelectAttack] = useState([-1,-1,-1])

	const allPlayers = () => getAllPlayers(game)

	const sendAttack = async (def: number[]) => {
		sendMsg("attack", {
			atkRow: selectAttack[0],
			atkCol: selectAttack[1],
			defRow: def[0],
			defCol: def[1],
			defPlayer: def[2],
		})

		setSelectedBoard([-1,-1,-1])
		setSelectAttack([-1,-1,-1])
	}

	function Boards() {
		const players = allPlayers()

		const opponentBoardStyles = [
			absCenter + " top-20 ", // TOP
			absCenterY + " left-20 ", // LEFT
			absCenterY + " right-20 ", // RIGHT 
		]
		let currentOpponent = -1

		return (<> { players.map((player: Player, i: number) => {

			
			let boardStyle = absCenter + " bottom-20 "
			if (player.number != game.playerNumber) {
				currentOpponent += 1
				boardStyle = opponentBoardStyles[currentOpponent]
			}

			return (<div key={i}>
				<BoardEvents
					className={"z-3 opacity-0 " + boardStyle}
					selectedBoard={selectedBoard}
					setHover={setHoverBoard}
					setCardHover={setCardHovered}
					player={player.number}
					setSelectedBoard={setSelectedBoard}
					selectAttack={selectAttack}
					sendAttack={sendAttack}
					board={player.board}
					opponent={
						game.playerNumber == player.number ?
							undefined : currentOpponent
					}
				/>
				<Board
					className={"z-0 " + boardStyle}
					board={player.board}
					selectedBoard={selectedBoard}
					player={player.number}
					opponent={
						game.playerNumber == player.number ?
							undefined : currentOpponent
					}
				/>
			</div>)
		})} </>)
	}

	function CenterMenu() {
		return <div className={absCenter + absCenterY}>
			<div>You: {game.playerNumber}</div>
			<div>Turn: {game.turn || "0"}</div>
			<div>Mana: {game.mana}</div>
			{hoverBoard}<br/>
			{selectedBoard}
			{game.player0board[0][0].name}
		</div>
	}

	
	return <div id="game-component" className={className}>
		<div 
			id="board"
			className="bg-blue-100 w-[80vw] h-[95vh] relative z-0">

			<CenterMenu/>
			<div id={"deck-"+game.playerNumber}
				className={boardCard + " absolute left-10 bottom-10 z-1"}>
				Your Deck
				{game.player0deck}
			</div>
			<OtherPlayers state={game}/>

			<Boards/>
			<Hands game={game} hoverBoard={hoverBoard} setCardHovered={setCardHovered} sendMsg={sendMsg}/>

			<div className="absolute bottom-10 right-10">
				<button onClick={() => {
					setSelectAttack(selectedBoard)
					setSelectedBoard([-1,-1,-1])
				}}>
					Attack	
				</button>
				<button onClick={() => sendMsg("end turn")}>
					End Turn
				</button>
			</div>
		</div>
	</div>
}
