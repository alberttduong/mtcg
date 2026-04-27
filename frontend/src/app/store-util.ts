import { 
	useSelector
} from "react-redux"
import {
	selectLobbyId,
	selectLobbies,
	selectLobbyReady,
} from "./store"

export function lobbyReadyToStartGame(): boolean {
	const lobbyReady = useSelector(selectLobbyReady)
	const lobbies = useSelector(selectLobbies)
	const lobbyId = useSelector(selectLobbyId)

	if (lobbyId == -1) return false

	const lobby = lobbies[lobbyId] 
	if (lobby == undefined) return false

	for (let i=0; i<lobby.members.length; ++i) {
		const n = lobby.members[i].name 
		if (!lobbyReady[n]) {
			return false
		}
	}

	return true
}
