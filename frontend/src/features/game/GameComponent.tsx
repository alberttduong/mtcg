import { GameState } from "./Game"
import { useState, useEffect } from "react"
import { boardCard, handStyle, handCard, gridCard,
	absCenter
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


export async function drawCard(player: number) {
	return
}

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
	drawCard: drawCard,
	attack: attack,
	die: die,
	takeDamage: takeDamage,
}

function myHand(game: GameState) {
	let hand
	switch (game.playerNumber) {
	case 0:
		hand = game.player0hand
		break
	case 1:
		hand = game.player1hand
		break
	default:
		return
	}
	return hand
}

function OtherPlayers(props: any) {
	const game: GameState = props.state

	if (game.playerNumber == null) return

	const otherHands = [game.player0hand, game.player1hand]
	const players = [0, 1]

	otherHands.splice(game.playerNumber, 1)
	players.splice(game.playerNumber, 1)

	return <div>
		{otherHands.map((hand, i) => {
			return <Hand 
				hand={hand} 
				player={players[i]}
				key={i} 
				className={
					"top-0 " +
					absCenter
				}/>
		})}
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


interface HandProps {
	hand?: string[],
	player?: number,
	onClick?: (arg0:number) => void,
	onDragEnd?: (arg0:number) => void,
	className?: string,
	setCardHovered?: (arg: CardHovered) => void,
}

export interface CardHovered {
	name: string
	player: number
	location: "hand" | "board"
	row?: number
	col?: number
}

function Hand(props: HandProps) {
	const {
		hand, 
		player, 
		onDragEnd, 
		className,
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
				drag
				layout
				dragElastic={0}
				dragSnapToOrigin
				onDragEnd={() => {if (onDragEnd) {
					onDragEnd(i)
				}}}
				//onClick={() => {if (onClick) onClick(i)}}
				key={i} 
				className={handCard}
				initial={{
					width: 0,
					color: "rgba(0, 0, 0, 0)"
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
	setSelectedBoard?: (arg: number[]) => void
	player: number
	selectAttack: number[]
	sendAttack: (defender: number[]) => void
	board: Card[][]
	opponent?: number
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
	} = props
	return <div className={className}>{
		[...Array(2)].map((_u, index) => {
			return <div className="flex" key={index}> {
				[...Array(5)].map((_u, jindex) => {
					let i = index
					let j = jindex
					if (opponent === 0) {
						i = Math.abs(i-1)
						j = Math.abs(j-4)
					}
					return (<motion.div 
						className={gridCard} 
						transition={{duration:0}}
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
								setSelectedBoard([i,j,player])
								if (selectAttack[0] != -1) {
									sendAttack([i,j,player])
								}
							}
						}}
						key={j}/>)
				})
			}
			</div>
		})
	}</div>
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
	return <div className={className}>{
		[...Array(2)].map((_u, index) => {
			return <div className="flex" key={index}> {
				[...Array(5)].map((_u, jindex) => {
					let i = index
					let j = jindex
					if (opponent === 0) {
						i = Math.abs(i-1)
						j = Math.abs(j-4)
					}

					let style = (selectedBoard && 
						selectedBoard[0] == i &&
						selectedBoard[1] == j &&
						selectedBoard[2] == player) ?
						" bg-yellow-100" : ""

					let card
					if (board && board[i] && board[i][j].name) {
						card = board[i][j]
					}


					return (<div 
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
					</div>)
				})
			}
			</div>
		})
	}</div>
}



interface Player {
	number: number
	board: Card[][]
	hand: string[]
}

interface Players {
	[number: number]: Player
}

interface GameComponentProps {
	game: GameState,
	sendMsg: (msg: string, body?: any) => void,
	setCardHovered: (arg: CardHovered) => void,
	className?: string,
}

export function GameComponent(props: GameComponentProps) {
	const { game, sendMsg, setCardHovered, className } = props
	const [selectedHand, setSelectedHand] = useState(-1)
	const [hoverBoard, setHoverBoard] = useState([-1,-1,-1])

	const [selectedBoard, setSelectedBoard] = useState([-1,-1,-1])
	const [selectAttack, setSelectAttack] = useState([-1,-1,-1])

	function allPlayers(): Player[] {
		return [
			{
				number: 0,
				hand: game.player0hand,
				board: game.player0board
			}, 
			{
				number: 1,
				hand: game.player1hand,
				board: game.player1board
			}
		]
	}

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

		const opponentBoardStyles = [" top-20 "]
		let currentOpponent = -1

		return (<> { players.map((player: Player, i: number) => {

			
			let boardStyle = " bottom-20 "
			if (player.number != game.playerNumber) {
				currentOpponent += 1
				boardStyle = opponentBoardStyles[currentOpponent]
			}

			return (<div key={i}>
				<BoardEvents
					className={
						"z-3 opacity-0 "
						+ boardStyle
						+ absCenter
					}
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
					className={
						"z-0 "
						+ boardStyle
						+ absCenter
					}
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
		return <div className="absolute top-[50%] left-1">
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
			<Hand
				hand={myHand(game)} 
				player={game.playerNumber}
				className={
					"bottom-0 z-1 " +
					absCenter
				}
				onDragEnd={(i: number) => {
					if (hoverBoard[0] != -1 && 
						hoverBoard[1] != -1 &&
					    hoverBoard[2] == game.playerNumber) {
						sendMsg("play hand", {
							"index": i,
							"r": hoverBoard[0],
							"c": hoverBoard[1],
						})
					}
				}}
				onClick={(i: number) => {
					setSelectedHand(i)
				}}
				setCardHovered={setCardHovered}
			/>
			<OtherPlayers state={game}/>

			<Boards/>

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
