import { GameState } from "./Game"
import { boardCard, handStyle, handCard, gridCard,
	absCenter
} from "./styles"
import { motion, animate,
	LayoutGroup,
	AnimatePresence,
} from "motion/react"

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

function Hand(props: any) {
	const hand: string[] = props.hand
	const player: number = props.player

	const onClick: (arg0:number) => void = props.onClick

	return (
	<div 
		id={"hand-"+player} 
		className={props.className + " flex"}
	>
		{hand && hand.map((card, i) => {
			return (
			<motion.div
				onClick={() => onClick(i)}
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
			>
				{card}
			</motion.div>
			)
		})}
	</div>
	)
}

function Board(props: any) {
	return <div className={props.className}>{
		[...Array(2)].map((_u, i) => {
			return <div className="flex" key={i}> {
				[...Array(5)].map((_u, i) => {
					return <div className={gridCard} key={i}/>
				})
			}
			</div>
		})
	}</div>
}


export function GameComponent(props: any) {
	const { state, sendMsg } = props
	const game: GameState = state 
	return <div id="game-component">
		<div>You: {game.playerNumber}</div>
		<div>Turn: {game.turn}</div>
		<div 
			id="board"
			className="bg-blue-100 w-[80vw] h-[100vh] relative">
			<div id={"deck-"+game.playerNumber}
				className={boardCard + " absolute left-10 bottom-10 z-1"}>
				Your Deck
			</div>
			<Hand
				hand={myHand(game)} 
				player={game.playerNumber}
				className={
					"bottom-0 " +
					absCenter
				}
				onClick={(i: number) => console.log(i)}
			/>

			<OtherPlayers state={game}/>
			<Board
				className={"bottom-20 "
					+ absCenter}
			/>
			<Board
				className={
					"top-0 "
					+ absCenter
				}
			/>
		</div>
		<button onClick={() => drawCard(0)}>
			test draw
		</button>
		<button onClick={() => sendMsg("end turn")}>
		End Turn
		</button>
	</div>
}
