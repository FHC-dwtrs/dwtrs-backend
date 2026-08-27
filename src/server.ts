/*import app from "./app";

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`DWTRS API running on http://localhost:${PORT}`);
});*/
import "dotenv/config";
import app from "./app.js";
import prisma from "./config/database.js";


const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
  try {
    await prisma.$connect();

    console.log("Database connected successfully");

    app.listen(PORT, () => {
      console.log(`DWTRS API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

startServer();