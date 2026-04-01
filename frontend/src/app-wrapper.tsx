//import { CenterCol } from "@/styles"
import { useEffect } from "react"
import { 
	connected,
	ConnectWS,
	send,
	type Response,
	useSendMsg,
	socketListener,
} from "@/app/middleware"
import { useSelector } from "react-redux"
import { 
	useAppDispatch,
	loginWithToken,
	loginAsUser,
	joinLobby,
	selectLobbies,
	setLobbies,
	addToChat,
	confirmSelectedDeck,
	setDeck,
	updateLobby,
} from "@/app/store"
import { useLocation, useNavigate } from "react-router-dom"

export function App(props: {className?: string, children: any}) {
	const {className, children} = props
	const dispatch = useAppDispatch()
	const sendMsg = useSendMsg(dispatch)
	const location = useLocation()
	const navigate = useNavigate()
	const setLobby = (lob: number) => {
		dispatch(joinLobby(lob))
	}

	useEffect(() => {
		ConnectWS().then(() => {
			loginWithToken((name: string) => {
				dispatch(loginAsUser(name))
			})

			socketListener((e: any) => {
				const res: Response = JSON.parse(e.data)
				//console.log('App received ' + res.Msg)
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
					}
					break
				case "get lobby":
					dispatch(setLobbies(res.Body.lobbies))
					break
				case "chat newmsg":
					dispatch(addToChat(res.Body.msg))
					break
				case "update lobby":
					dispatch(updateLobby(res.Body))
					break
				case "set deck":
					if (res.StatusCode == 0) {
						dispatch(setDeck(res.Body))
					} else if (res.StatusCode == 200) {
						dispatch(confirmSelectedDeck(res.Body["deckName"]))
					}
					break
				case "join lobby":
					if (res.StatusCode == 200) {
						setLobby(res.Body.lobbyId)
						navigate('/game')
					}
					break
				case "leave lobby":
					if (res.StatusCode == 200) {
						setLobby(-1)
					}
					break
				}
			})

			sendMsg("get lobby")
		})
	},[])

	return <div className={className}>
		{children}
	</div>
}
