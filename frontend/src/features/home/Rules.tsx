import { HomeWrapper } from "./HomeWrapper"

export function GameRules(props: {className?: string}) {
	const {className} = props
	return <div className={className}>
		<p>Beach Wars is a 2-5 player turn-based card game with the objective of having the last Sand Castle standing.</p>
		<h2>Board</h2>
			<p>Every player has a 2x5 grid of Land they can play their cards on. Players start off with a Sand Castle in the middle of their Land.</p>
		<h2>Cards</h2>
			<p>Cards (like Blaster and Sand Wall) have health, attack, and Water cost points. To play a card onto your Land, you must pay its Water cost.</p>
			<p>Water is a resource used to play some cards. The amount of Water you get at the start of turns increments after everyone gets their turn. Leftover Water isn't carried over to your next turn.</p>
			<p>Cards can attack Sand Castles and other cards. Attacking costs 1 Water.</p>
	</div>
}

export default function Rules() {
	return <HomeWrapper>
		<div className="w-[35vw] mb-4">
			
			<h1>Deckbuilding Guide</h1>
			<p>To play a game you have to first build or import a deck with the following requirements</p>
			<ul>
				<li>At least 10 cards</li>
				<li>No more than 30 cards</li>
				<li>No more than 4 of the same card</li>
			</ul>
			<p>You'll know if your deck doesn't meet these requirements when you save your deck</p>

			<h1>Game Rules</h1>
			<GameRules/>
			<br/>
		</div>
	</HomeWrapper>
}
