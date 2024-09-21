import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { db } from "@minikura/db";

const app = new Elysia()
  .use(swagger())
  .get("/", async () => {
    return "Hello Elysia";
  })
  .get("/hello", "Do you miss me?")
  .listen(3000, async () => {
    console.log("Server is running on port 3000");
    const result = await db.query.server.findMany();
    console.log(result);
  });

export type App = typeof app;
