import { Express, Request, Response } from "express";
import {
  createPhotoHandler,
  getPhotoHandler,
  deletePhotoHandler,
  deleteAlbumHandler,
  changeAlbumHandler
} from "./controller/photo.controller";
import {
  createUserSessionHandler,
  getUserSessionsHandler,
  deleteSessionHandler,
} from "./controller/session.controller";
import { createUserHandler } from "./controller/user.controller";
import requireUser from "./middleware/requireUser";
import validateResource from "./middleware/validateResource";
import { createSessionSchema } from "./schema/session.schema";
import { createUserSchema } from "./schema/user.schema";



function routes(app: Express) {

  app.get("/healthcheck", (req: Request, res: Response) => res.sendStatus(200));
    

  app.post("/api/users", validateResource(createUserSchema), createUserHandler);

  app.post(
    "/api/sessions",
    validateResource(createSessionSchema),
    createUserSessionHandler
  );

  app.get("/api/sessions", requireUser, getUserSessionsHandler);

  app.delete("/api/sessions", requireUser, deleteSessionHandler);

  app.post(
    "/load-photos",
    [requireUser],
    createPhotoHandler
  );

  app.get('/get-photos',
    getPhotoHandler
  );

  app.get('/delete-photo',
    [requireUser],
    deletePhotoHandler
  );

  app.get('/delete-album',
    [requireUser],
    deleteAlbumHandler
  );

  app.get('/change-album',
    [requireUser],
    changeAlbumHandler
  );

}
export default routes;

