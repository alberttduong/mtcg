interface LobbyMenuProps {
	sendMsg: (msg: string, body?: any) => void
}

export function LobbyMenu({sendMsg}: LobbyMenuProps) {
	function createLobby() {
		sendMsg("create lobby")
	}
	function joinLobby() {
		sendMsg("join lobby", {lobbyId: 1})
	}

	return <div 
		className={"w-[250px] bg-yellow-100 p-2 flex "}
		>
		{/* User not in a lobby */}
		<div className="flex-col w-full">
			<label>You aren't in a Lobby</label>
			<div className="text-sm"><h1>Available Lobbys:</h1>
				<ul>
				<li>Lobby 1: X/Y Players</li>
				</ul>
			</div>
			<div className="flex justify-between m-2">
				<button onClick={createLobby}>Create Lobby</button>
				<button onClick={joinLobby}>Join Lobby</button>
			</div>
		</div>
	</div>
}
