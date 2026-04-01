echo "initializing database"
cat users.sql | sqlite3 users.db
echo "starting vite in bg"
fuser -k 5173/tcp; npm run dev --prefix frontend &
echo "starting server"
fuser -k 8080/tcp; go run .
