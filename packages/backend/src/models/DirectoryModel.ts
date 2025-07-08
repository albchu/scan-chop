import fs from 'fs/promises';
import path from 'path';
import { WebContents } from 'electron';
import { isImageFile } from '../utils/isImageFile';
import { ImageFileModel } from './ImageFileModel';
import { BaseModel } from './BaseModel';
import { IPC_CHANNELS } from '@workspace/shared';

export class DirectoryModel extends BaseModel {
  public imageFiles = new Map<string, ImageFileModel>();
  public subdirectories: string[] = [];

  constructor(public dirPath: string, sender: WebContents) {
    super(sender);
  }

  public override async load(): Promise<void> {
    const entries = await fs.readdir(this.dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(this.dirPath, entry.name);

      if (entry.isDirectory()) {
        this.subdirectories.push(fullPath);
      } else if (entry.isFile() && isImageFile(fullPath)) {
        const imageModel = new ImageFileModel(fullPath, this, this.sender);
        this.imageFiles.set(fullPath, imageModel);
        await imageModel.load();
      }
    }

    this.send(IPC_CHANNELS.DIRECTORY_READY, {
      path: this.dirPath,
      imagePaths: [...this.imageFiles.keys()],
      subdirectories: this.subdirectories,
    });
  }

  public async loadImage(targetPath: string): Promise<ImageFileModel> {
    if (!targetPath.startsWith(this.dirPath)) {
      throw new Error(`Image path ${targetPath} is not within directory ${this.dirPath}`);
    }

    const imageModel = this.imageFiles.get(targetPath);
    if (!imageModel) {
      throw new Error(`Image not found in directory: ${targetPath}`);
    }

    await imageModel.load();
    return imageModel;
  }
} 