echo "initializing database"
cat users.sql | sqlite3 users.db
echo "starting vite in bg"
npm run dev --prefix frontend &
echo "starting server"
go run .
