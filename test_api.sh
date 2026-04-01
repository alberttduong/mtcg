echo loading sql into db
cat users.sql | sqlite3 users.db

echo restarting server
fuser -k 8080/tcp; go run . &

go test -run Login
