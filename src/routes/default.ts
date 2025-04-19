import { app } from "..";

export default function () {
  app.get("/", async (c) => {
    return c.text("Congrats on finding this you silly goose!");
  });
}
