module github.com/alberttduong/multiplayer-tcg

go 1.24.3

require (
	github.com/gorilla/websocket v1.5.3
	github.com/mattn/go-sqlite3 v1.14.32
	gserver v0.0.0-00010101000000-000000000000
)

require github.com/gorilla/mux v1.8.1

require github.com/rs/cors v1.11.1 // indirect

replace gserver => ../gserver
