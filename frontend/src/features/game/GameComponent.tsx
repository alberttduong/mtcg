import { GameState } from "./Game"
import { useState } from "react"
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

export const animation = {
	drawCard: drawCard
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
			</div>
		})
	}
	</div>
}


interface HandProps {
	hand?: string[],
	player?: number,
	className?: string,
	onClick?: (arg0:number) => void,
	onDragEnd?: (arg0:number) => void,
}

function Hand(props: HandProps) {
	const {hand, player, onClick, onDragEnd, className} = props

	const variants = {
		invis: {
			width: 0,
			color: "rgba(0, 0, 0, 0)"
		},
		vis: {
			width: 60,
			color: "rgba(0, 0, 0, 1)"
		}
	}
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
				whileHover={{
					y: -8,
					zIndex: 4,
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

interface BoardProps {
	className?: string
	board?: Card[][]
	setHover?: (arg: number[]) => void
}
function Board(props: BoardProps) {
	const { className, setHover, board } = props
	return <div className={className}>{
		[...Array(2)].map((_u, i) => {
			return <div className="flex" key={i}> {
				[...Array(5)].map((_u, j) => {
					return (
					<motion.div 
						className={gridCard} 
						transition={{duration:0}}
						onPointerEnter={ () => {
							if (setHover) {
								setHover([i,j])
							}
						}}
						onPointerLeave={ () => {
							if (setHover) {
								setHover([-1,-1])
							}
						}}
						key={j}
					>
					{board && board[i][j].name}
					</motion.div>)
				})
			}
			</div>
		})
	}</div>
}


export function GameComponent(props: any) {
	const { state, sendMsg } = props
	const [selectedHand, setSelectedHand] = useState(-1)
	const [hoverBoard, setHoverBoard] = useState([-1,-1])

	const game: GameState = state 
	return <div id="game-component">
		<div>You: {game.playerNumber}</div>
		<div>Turn: {game.turn}</div>
		<div 
			id="board"
			className="bg-blue-100 w-[80vw] h-[100vh] relative z-0">
			<div id={"deck-"+game.playerNumber}
				className={boardCard + " absolute left-10 bottom-10 z-1"}>
				Your Deck
			</div>
			<Hand
				hand={myHand(game)} 
				player={game.playerNumber}
				className={
					"bottom-0 z-1 " +
					absCenter
				}
				onDragEnd={(i: number) => {
					if (hoverBoard[0] != -1 && hoverBoard[1] != -1) {
						sendMsg(`playing ${i} on ${hoverBoard}`)
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
			/>

			<OtherPlayers state={game}/>
			<Board
				className={"bottom-20 z-3 opacity-0 "
					+ absCenter}
				setHover={setHoverBoard}
			/>
			<Board
				className={"bottom-20 z-0 " + absCenter}
				board={ game.player0board }
			/>

			<Board
				className={
					"top-20 "
					+ absCenter
				}
				board={ game.player0board }
			/>
		</div>
		{hoverBoard}
		<button onClick={() => drawCard(0)}>
			test draw
		</button>
		<button onClick={() => sendMsg("end turn")}>
		End Turn
		</button>
	</div>
}
