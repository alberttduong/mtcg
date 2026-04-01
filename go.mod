module github.com/alberttduong/multiplayer-tcg

go 1.24.3

require (
	github.com/gorilla/websocket v1.5.3
	github.com/mattn/go-sqlite3 v1.14.32
	gserver v0.0.0-00010101000000-000000000000
)

require github.com/gorilla/mux v1.8.1

require (
	github.com/dgrijalva/jwt-go v3.2.0+incompatible // indirect
	github.com/golang-jwt/jwt/v5 v5.3.0 // indirect
	github.com/google/renameio v1.0.1 // indirect
	github.com/profclems/go-dotenv v1.1.1 // indirect
	github.com/rs/cors v1.11.1 // indirect
	github.com/spf13/cast v1.9.2 // indirect
	golang.org/x/crypto v0.42.0 // indirect
)

replace gserver => ../gserver
