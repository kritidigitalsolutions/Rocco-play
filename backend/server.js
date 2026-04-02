require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const port = process.env.PORT || 5000;

const startServer = async () => {
	try {
		await connectDB();
		app.listen(port, () => {
			console.log(`> Server is up and running on port: ${port}`);
		});
	} catch (error) {
		console.error("Server startup failed:", error.message);
		process.exit(1);
	}
};

startServer();