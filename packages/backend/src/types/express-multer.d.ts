declare namespace Express {
  interface Request {
    file?: Multer.File;
  }
}

declare namespace Multer {
  interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }
}