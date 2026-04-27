package main

import (
	"fmt"
	"net/http"
	"log"
	"strings"
	"os"
	"golang.org/x/crypto/bcrypt"
	
	"github.com/gorilla/websocket"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
	"github.com/golang-jwt/jwt/v5"
	"github.com/profclems/go-dotenv"

	"github.com/alberttduong/gameserver"
	"io"
	"encoding/json"

	"database/sql"
	_ "github.com/mattn/go-sqlite3"	
)

var ENV struct {
	jwt_key string
}

func getDeckString(db *sql.DB, username string) (deck string, err error) {
	err = db.QueryRow(`SELECT (deck) FROM users WHERE name=?`, username).Scan(&deck)
	log.Printf("deck: %s", deck)
	return
}

func init() {
	err := dotenv.Load()
	if err != nil {
		log.Printf("Error loading .env file: %s", err.Error())
		log.Println("Loading env vars")
		ENV.jwt_key = os.Getenv("JWT_KEY")
		return
	}

	ENV.jwt_key = dotenv.GetString("JWT_KEY")
}

func serveHome(w http.ResponseWriter, r *http.Request) {
	log.Println(r.URL)
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		log.Println(r.URL)
		return
	}
	//w.WriteHeader(200)
	io.WriteString(w, `{"alive": true}`)
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool { return true },
}

func statePerPlayer(player int, master StateUpdate, lobby *gameserver.Lobby) StateUpdate {
	// todo remove player 0
	master.PlayerNumber = &player

	return master 
}

func verifyTurn(response *gameserver.Msg, game GameState, client *gameserver.Client) (bool) {
	if client.Lobby == nil {
		log.Printf("Error: Expected client to be in a lobby")
		response.ErrS("Server error verifying turns")
		return false 
	}

	p, ok := client.Lobby.GetPrivateState(client, "player")
	if !ok {
		log.Printf("Error: Lobby private state does not have player number")
		response.ErrS("Server error verifying turns")
		return false
	}

	playerNumber, ok := p.(int)
	if !ok {
		log.Printf("Error: Couldn't convert lobbystate to int player number")
		response.ErrS("Server error verifying turns")
		return false
	}

	if game.Turn == playerNumber {
		return true
	}
	response.ErrS("It is not your turn")
	return false
}

func broadcastStartGame(lobby *gameserver.Lobby, master GameState) {
	msg := gameserver.Msg{
		StatusCode: 0,
		Msg: "start game",
		Body: make(map[string]interface{}),
	}

	np, ok := lobby.GetState("numPlayers")
	if !ok {
		panic("No numplayers set")
	}
	numPlayers, ok := np.(int)
	if !ok {
		panic("num players isnt an int")
	}
	for i := range numPlayers {
		p := i+1

		c, ok := lobby.GetState(fmt.Sprintf("player%d",p))
		if !ok {
			panic("player not found")
		}
		client, ok := c.(*gameserver.Client)
		if !ok {
			panic("client wrong type")
		}
		state := flatten(master)
		state.PlayerNumber = &i
		msg.Body["state"] = state
		names, err := lobby.GetPlayerNames()
		if err != nil {
			log.Print(err)
			panic("couldnt get names of players")
		}
		msg.Body["names"] = names

		gameserver.SendToClient(msg, client)
	}
}

func broadcastStatesToClients(lobby *gameserver.Lobby, master StateUpdate) {
	update := gameserver.Msg{
		StatusCode: 0,
		Msg: "update game",
		Body: make(map[string]interface{}),
	}

	np, ok := lobby.GetState("numPlayers")
	if !ok {
		panic("No numplayers set")
	}
	numPlayers, ok := np.(int)
	if !ok {
		panic("num players isnt an int")
	}
	for i := range numPlayers {
		p := i+1

		c, ok := lobby.GetState(fmt.Sprintf("player%d",p))
		if !ok {
			panic("player not found")
		}
		client, ok := c.(*gameserver.Client)
		if !ok {
			panic("client wrong type")
		}
		update.Body["updates"] = statePerPlayer(i, master, lobby)
		gameserver.SendToClient(update, client)
	}
}

func broadcastUpdates(lobby *gameserver.Lobby, updates []GameStateUpdate) {
	body := map[string]interface{}{"updates": updates}
	lobby.Broadcast(gameserver.Msg{
		Msg: "update game",
		StatusCode: 0,
		Body: body,
	})
}

func execute(
	client *gameserver.Client, 
	server *gameserver.Server, 
	msg gameserver.Msg,
	wsctx gameserver.WSCtx,
) error {
	if gameserver.ReceiveLobbyCommands(client, server, msg) {
		if msg.Msg == "join lobby" && client.Lobby != nil {
			body := map[string]any{}
			for _, c := range client.Lobby.GetMembers() {
				if c == nil {
					return Err{"Expected client from getplayer"}
				}
				_, ok := client.Lobby.GetPrivateState(c, "deck")
				if ok {
					body[c.Name] = true
				}
			}
			
			client.Lobby.Broadcast(gameserver.Msg{
				Msg: "players ready", 
				Body: body,
			})

			fmt.Printf("%v", body)
		}
		return nil
	}
	if gameserver.ReceiveChatCommands(client, server, msg) {
		return nil
	}

	e := Executor{client: client, db: wsctx.Db}
	response := e.executeCommand(msg)

	gameserver.SendToClient(response, client)
	log.Printf("Response: %v", response)
	return nil
}

type Err struct { msg string }
func (e Err) Error() string { return e.msg }

func validateDeckString(d string) (deckMap DeckMap, err error) {
	defer func() {
		log.Printf("%v", deckMap)
		err = validateDeck(deckMap) 
	}()
	
	d = strings.ReplaceAll(d, "'", "\"")
	var deckMapF DeckMap2
	
	errInt := json.Unmarshal([]byte(d), &deckMap)
	errFlt := json.Unmarshal([]byte(d), &deckMapF)

	if errInt == nil {
		log.Printf("deck map was sent as [string]int")
		return
	}

	if errFlt == nil {
		log.Printf("deckmap: converting float to int")
		deckMap = map[string]int{}
		for k, v := range deckMapF {
			deckMap[k] = int(v)
		}
		return
	}

	return nil, Err{"Couldn't parse: not a string map"}
}

func validateDeck(deckMap DeckMap) error {
	numCards := 0
	for name, amount := range deckMap {
		if amount <= 0 {
			return Err{"Card amounts must be greater than 0"}
		}
		if amount > CARD_AMOUNT_LIMIT {
			return Err{fmt.Sprintf("Card amounts must be no more than %d", CARD_AMOUNT_LIMIT)}
		}
		if _, ok := Cards[name]; !ok {
			return Err{fmt.Sprintf("Card %s doesn't exist", name)}
		}
		numCards += amount
	}

	if numCards < DECK_MIN_SIZE {
		return Err{fmt.Sprintf("Decks must have at least %d cards", DECK_MIN_SIZE)}
	}

	if numCards > DECK_SIZE {
		return Err{fmt.Sprintf("Decks cannot have more than %d", DECK_SIZE)}
	}


	return nil
}

type Credentials struct {
	Name string `json:"name"`
	Password string `json:"password"`
	Token string `json:"token"`
}

func verifyToken(token string) (user string, err error) {
	parsedT, err := jwt.Parse(token, 
		func(token *jwt.Token) (any, error) {
			return []byte(ENV.jwt_key), nil
		}, 
		jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}))

	if err != nil {
		return user, err
	}
	
	if claims, ok := parsedT.Claims.(jwt.MapClaims); ok {
		return claims.GetSubject()
	}
	return user, Err{"unable to parse claims"}
}

func createToken(user string) (token []byte, err error) {
	t := jwt.NewWithClaims(jwt.SigningMethodHS256, 
		jwt.MapClaims{"sub": user})
	s, err := t.SignedString([]byte(ENV.jwt_key))
	return []byte(s), err
}

// Writes HTTP Error.
func getAuthUser(w http.ResponseWriter, r *http.Request) (string, error) {
	token, ok := r.Header["Authorization"]
	if !ok || len(token) == 0 {
		http.Error(w, "Authorization header not found or empty", http.StatusBadRequest)
		return "", Err{}
	}

	username, err := verifyToken(token[0])
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
	}

	return username, err
}

func handleLogin(db *sql.DB, w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var userInfo Credentials
	err := json.NewDecoder(r.Body).Decode(&userInfo) 
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	stmt, err := db.Prepare(`SELECT (password) FROM users WHERE name = ?;`)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		return
	}

	var password []byte
	err = stmt.QueryRow(userInfo.Name).Scan(&password)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("User not found"))
		return
	}

	err = bcrypt.CompareHashAndPassword(password, []byte(userInfo.Password))
	if err != nil && len(password) > 6 {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("Incorrect password"))
		return
	}

	token, err := createToken(userInfo.Name)
	w.Write(token)
}


func handleSignup(db *sql.DB, w http.ResponseWriter, r *http.Request) error {
	if r.Method != http.MethodPut {
		return Err{"Expected PUT method"}
	}

	var userInfo Credentials
	err := json.NewDecoder(r.Body).Decode(&userInfo) 
	if err != nil {
		return err
	}

	if userInfo.Name == "" || userInfo.Password == "" {
		return Err{"Must provide name and password"}
	}
		
	stmt, err := db.Prepare(`INSERT INTO users (name, password) VALUES (?, ?)`)
	if err != nil {
		return err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword(
		[]byte(userInfo.Password), bcrypt.MinCost)
	if err != nil {
		return err
	}

	res, err := stmt.Exec(userInfo.Name, hashedPassword)
	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return Err{"No rows affected"}
	}
	token, err := createToken(userInfo.Name)
	w.Write(token)
	return nil
}

func handleValidateDeck(r *http.Request) (DeckMap, error) {
	var deck DeckMap
	err := json.NewDecoder(r.Body).Decode(&deck) 
	if err != nil {
		return nil, err
	}

	return deck, validateDeck(deck)
}

func handlePutDeck(db *sql.DB, w http.ResponseWriter, r *http.Request, username string) error {
	deck, err := handleValidateDeck(r)
	if err != nil {
		return err
	}

	jd, _ := json.Marshal(deck)
	jsonDeck := string(jd)

	log.Printf("body = %s", jsonDeck)
	stmt, err := db.Prepare(`UPDATE users SET deck=? WHERE name=?`)
	res, err := stmt.Exec(jsonDeck, username)
	if err != nil {
		return err
	}
	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return Err{"No rows affected"}
	}
	w.WriteHeader(http.StatusOK)
	return nil
}

func main() {
	server := gameserver.InitServer()

	db, err := sql.Open("sqlite3", "./users.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	router := mux.NewRouter()
	router.HandleFunc("/", serveHome)
	router.HandleFunc("/testcxn", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(200)
	})
	router.HandleFunc("/login", func(w http.ResponseWriter, r *http.Request) {
		handleLogin(db, w, r)
	})
	router.HandleFunc("/signup", func(w http.ResponseWriter, r *http.Request) {
		log.Println(r.URL)
		err := handleSignup(db, w, r)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			log.Println(err)
		}
	})
	router.HandleFunc("/cards", func(w http.ResponseWriter, r *http.Request) {
		log.Println(r.URL)
		bytes, _ := json.Marshal(Cards)	
		log.Printf("%s", bytes)
		w.Write(bytes)
	})
	router.HandleFunc("/validatedeck", func(w http.ResponseWriter, r *http.Request) {
		log.Println(r.URL)

		_, err := handleValidateDeck(r)
		if err != nil {
			w.WriteHeader(400)
			w.Write([]byte(err.Error()))
		} else {
			w.WriteHeader(http.StatusOK)
		}
	})
	router.HandleFunc("/deck", func(w http.ResponseWriter, r *http.Request) {
		log.Println(r.URL)

		username, err := getAuthUser(w, r)
		if err != nil {
			return
		}

		if r.Method == http.MethodGet {
			deck, err := getDeckString(db, username)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			io.WriteString(w, deck)
		} else if r.Method == http.MethodPut {
			err := handlePutDeck(db, w, r, username)
			if err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				log.Println(err)
				return
			}
		}
	})
	router.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		log.Printf("client connected")
		if err != nil {
			log.Println(err)
			return
		}
		go gameserver.HandleWSClient(conn, server, execute, gameserver.WSCtx{W:w, R:r, Db:db})
	})

	c := cors.New(cors.Options{
        AllowedOrigins: []string{
			"http://localhost:*",
			"http://mtcg.albertduong.com",
			"https://mtcg.albertduong.com",
		},
        AllowCredentials: true,
		AllowedHeaders: []string{"*"},
		AllowedMethods: []string{"GET", "PUT"},
    })

    handler := c.Handler(router)
	err = http.ListenAndServe(":8080", handler)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
