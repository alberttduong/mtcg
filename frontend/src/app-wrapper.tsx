//import { CenterCol } from "@/styles"
import { useEffect } from "react"
import { 
	ConnectWS,
	type Response,
	useSendMsg,
	socketListener,
} from "@/app/middleware"
import { 
	useAppDispatch,
	loginWithToken,
	loginAsUser,
	joinLobby,
	setLobbies,
	addToChat,
	setDeckData,
	setDeck,
	setGameState,
	setGameNames,
	setIsLeader,
	updateLobby,
} from "@/app/store"
import { usePopup, Popup } from "@/features/component/popup"

import { 
	useNavigate 
} from "react-router-dom"

export function App(props: {className?: string, children: any}) {
	const {className, children} = props
	const dispatch = useAppDispatch()
	const sendMsg = useSendMsg(dispatch)
	const navigate = useNavigate()
	const setLobby = (lob: number) => {
		dispatch(joinLobby(lob))
	}

	const [ newPopup, closePopup, popupText ] = usePopup()

	useEffect(() => {
		ConnectWS().then(() => {
			loginWithToken((name: string) => {
				dispatch(loginAsUser(name))
			})

			socketListener((e: any) => {
				const res: Response = JSON.parse(e.data)
				//console.log('App received ' + res.Msg)
				if (res.StatusCode == 400) {
					newPopup(`${res.Msg} error: ${res.Body.error}`)
					return
				}

				switch (res.Msg) {
				case "create lobby":
					if (res.StatusCode == 200) {
						setLobby(res.Body.lobbyId)
						dispatch(updateLobby({
							id: res.Body.lobbyId,
							members: [{
								name: res.Body.leaderNickname,
								isLeader: true,
							}]
						}))
						dispatch(setIsLeader(true))
					}
					break
				case "get lobby":
					dispatch(setLobbies(res.Body.lobbies))
					break
				case "chat newmsg":
					dispatch(addToChat(res.Body))
					break
				case "update lobby":
					dispatch(updateLobby(res.Body))
					break
				case "player ready":
					if (res.StatusCode == 0) {
						dispatch(setDeck(res.Body))
					}
					break
				case "players ready":
					if (res.StatusCode == 0) {
						for (const [name,] of Object.entries(res.Body)) {
							dispatch(setDeck({name: name, ready: true}))
						}
					}
					break
				case "set deck":
					if (res.StatusCode == 200) {
						const d = res.Body["deck"]
						const x = d.replace(/'/g, "\"")
						dispatch(setDeckData(JSON.parse(x)))
					}
					break
				case "join lobby":
					if (res.StatusCode == 200) {
						setLobby(res.Body.lobbyId)
					}

					break
				case "leave lobby":
					if (res.StatusCode == 200) {
						setLobby(-1)
						dispatch(setIsLeader(false))
						dispatch(setDeckData(undefined))
					}
					break
				case "promote leader":
					dispatch(setIsLeader(true))
					break
				case "start game":
					if (res.StatusCode != 0)
						break	

					dispatch(setGameState(res.Body.state))
					dispatch(setGameNames(res.Body.names))
					navigate("game")
					break
				}
			})

			sendMsg("get lobby")
		})
	},[])

	return <div className={className}>
		<Popup text={popupText} closePopup={closePopup}/>
		{children}
	</div>
}
