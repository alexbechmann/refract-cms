import { createServerPlugin, repositoryForSchema, createResolverPlugin } from '@refract-cms/server';
import { fileSystemImagePluginConfig } from './';
import multer from 'multer';
import uniqueString from 'unique-string';
import { FileModel } from './file.model';
import { FileSystemImageSchema } from './file-system-image.schema';
import jimp from 'jimp';
import { Crop } from './crop.model';
import fileSystemImageResolverPlugin from './file-system-image-resolver-plugin';

interface FileSystemImageServerPluginOptions {
  filesPath: string;
}

export const fileSystemImageServerPlugin = ({ filesPath }: FileSystemImageServerPluginOptions) =>
  createServerPlugin(fileSystemImagePluginConfig, {
    events: {},
    resolverPlugins: [fileSystemImageResolverPlugin],
    configureRouter: router => {
      const storage = multer.diskStorage({
        destination: filesPath,
        filename(req, file, cb) {
          console.log(file);
          cb(null, `${uniqueString()}_${file.originalname}`);
        }
      });
      const upload = multer({ storage });

      router.get('/files/:id', async (req, res) => {
        const fileRepository = repositoryForSchema(FileSystemImageSchema);
        const { id } = req.params;
        const crop = req.query;
        const entity = await fileRepository.findById(id);

        if (entity.fileRef) {
          const img = await jimp.read(entity.fileRef.path);

          if (crop.x && crop.y && crop.width && crop.height) {
            img.crop(parseInt(crop.x), parseInt(crop.y), parseInt(crop.width), parseInt(crop.height));
          } else if (crop.width && crop.height) {
            img.cover(parseInt(crop.width), parseInt(crop.height));
          }

          const imgBuffer = await img
            .quality(80)
            .getBufferAsync(entity.fileRef.mimetype)
            .catch(() => res.sendStatus(500));
          res.writeHead(200, { 'Content-Type': entity.fileRef.mimetype });
          res.end(imgBuffer, 'binary');
        } else {
          res.sendStatus(500);
        }
      });

      router.post('/files', upload.single('file'), (req, res) => {
        const { mimetype, path, filename, size } = req.file;
        res.send(req.file);
      });
    }
  });
