import { Express, Request, Response, NextFunction } from "express";
import { Photo, PhotoModel } from '../models/photo';
import { Album, AlbumModel } from '../models/album';
import axios from 'axios';
import validator from "validator";
import {ObjectId} from 'mongodb';
import { AnyZodObject } from "zod";



export async function createPhotoHandler (
  req: Request, res: Response, next: NextFunction) {

const user = res.locals.user;
  try {
    const resp = await axios.get('http://jsonplaceholder.typicode.com/photos');
    let album: Album | null;
    let result = {
      duplicated: 0,
      inserted: 0,
    };
    for (let item of resp.data) {
      album = await AlbumModel.findOne({ title: item.albumId, owner: user._id });
      if (!album) {
        album = new AlbumModel({ title: item.albumId, owner: user._id });
        await album.save();
      }
      const photo: Photo = new PhotoModel({
        albumId: album._id,
        title: item.title,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        owner: user._id,
      });
      try {
        await photo.save();
        result.inserted++;
      } catch (err:any) {
        if (err.code === 11000) {
          result.duplicated++;
        } else {
          throw err;
        }
      }
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
};

function next(err: unknown) {
	throw new Error("Function not implemented.");
}

export async function getPhotoHandler(
  req: Request, res: Response, next: NextFunction) {
  try {   
    let ownerid = req.query.ownerid;
    if (typeof ownerid !== 'string' || !validator.isMongoId(ownerid)) {
      ownerid = undefined;
    }
    const query: {
      ownerid: string | undefined;
      page: number;
      maxcount: number;
    } = {
      ownerid,
      page: typeof req.query.page === 'string' ? parseInt(req.query.page) : NaN,
      maxcount: typeof req.query.maxcount === 'string' ? parseInt(req.query.maxcount) : NaN,
    };
    if (!query.page || !query.maxcount) {
      return res.status(400).json({ error: "'page' and 'maxcount' must be set as a number > 0" });
    }    
    if (query.page < 1) {
      return res.status(400).json({ error: "'page' must be >= 1" });
    }
    if (query.maxcount < 1 || query.maxcount > 100) {
      return res.status(400).json({ error: "'maxcount' must be in 1-100" });
    }
    let photos: Photo[];
    let skip: number = (query.page - 1) * query.maxcount;
    if (query.ownerid) {
      photos = await PhotoModel.find({ owner: new ObjectId(query.ownerid) })
        .skip(skip)
        .limit(query.maxcount);
    } else {
      photos = await PhotoModel.find({}).skip(skip).limit(query.maxcount);
    }
    res.json({ query, photos });
  } catch (err) {
    return next(err);
  }
};

export async function deletePhotoHandler(
  req: Request, res: Response, next: NextFunction) {
      try {
    const user = res.locals.user;
    let photoid = req.query.photoid;
    if (typeof photoid !== 'string') {
      return res.status(400).json({ error: 'photoid must be a string' });
    }
    let photoIds: string[] = photoid.split(',');
    let photoObjectIds;
    try {
      photoObjectIds = photoIds.map((id: any) => new ObjectId(id));
    } catch (err:any) {
      if (err.name === 'BSONTypeError') {
        return res.status(400).json({ error: 'photoid must be ObjectId or list of ObjectId' });
      } else {
        throw err;
      }
    }
    // check if id list contains photos owned by another user
    const forbiddenPhoto: Photo | null = await PhotoModel.findOne({
      _id: { $in: photoObjectIds },
      owner: { $ne: user._id },
    });
    if (forbiddenPhoto) {
      return res.status(403).json({ error: 'id list contains a non-user photo' });
    }
    const result = await PhotoModel.deleteMany({ _id: { $in: photoObjectIds } });
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export async function deleteAlbumHandler(
  req: Request, res: Response, next: NextFunction) {
      try {
    const user = res.locals.user;
    let albumid = req.query.albumid;
    if (typeof albumid !== 'string') {
      return res.status(400).json({ error: 'albumid must be a string' });
    }
    let albumIds = albumid.split(',');
    let albumObjectIds;
    try {
      albumObjectIds = albumIds.map((id: any) => new ObjectId(id));
    } catch (err:any) {
      if (err.name === 'BSONTypeError') {
        return res.status(400).json({ error: 'albumid must be ObjectId or list of ObjectId' });
      } else {
        throw err;
      }
    }
    // check if id list contains albums owned by another user
    const forbiddenAlbum: Album | null = await AlbumModel.findOne({
      _id: { $in: albumObjectIds },
      owner: { $ne: user._id },
    });
    if (forbiddenAlbum) {
      return res.status(403).json({ error: 'id list contains a non-user album' });
    }
    const deletePhotoResult = await PhotoModel.deleteMany({ albumId: { $in: albumObjectIds } });
    const deleteAlbumResult = await AlbumModel.deleteMany({ _id: { $in: albumObjectIds } });
    res.json({ result: { deletePhotoResult, deleteAlbumResult } });
  } catch (err) {
    next(err);
  }
};

export async function changeAlbumHandler(
  req: Request, res: Response, next: NextFunction) {
      try {
    const user = res.locals.user;

    let albumid = req.query.albumid;    
    if (typeof albumid !== 'string' || !validator.isMongoId(albumid)) {
      return res.status(400).json({ error: 'albumid must be ObjectId' });
    }

    let new_album_name = req.body.new_album_name;
    if (typeof new_album_name !== 'string') {
      return res.status(400).json({ error: 'new_album_name must be a string' });
    }

    // check if album is owned by another user
    const forbiddenAlbum = await AlbumModel.findOne({
      _id: new ObjectId(albumid),
      owner: { $ne: user._id },
    });
    if (forbiddenAlbum) {
      return res.status(403).json({ error: 'non-user album' });
    }

    const result = await AlbumModel.updateOne(
      { _id: new ObjectId(albumid) },
      { title: new_album_name }
    );
    res.json({ result });
  } catch (err) {
    next(err);
  }
};