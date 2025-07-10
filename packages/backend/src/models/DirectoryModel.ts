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
  public path: string;

  constructor(public dirPath: string, sender: WebContents) {
    super(sender);
    this.path = dirPath;
  }

  public override async load(): Promise<void> {
    console.log('[Main] DirectoryModel load called with path:', this.dirPath);
    const entries = await fs.readdir(this.dirPath, { withFileTypes: true });

    // Build fileTree entries
    const items = [];

    for (const entry of entries) {
      const fullPath = path.join(this.dirPath, entry.name);

      if (entry.isDirectory()) {
        this.subdirectories.push(fullPath);
        items.push({
          name: entry.name,
          path: fullPath,
          isDirectory: true
        });
      } else if (entry.isFile() && isImageFile(fullPath)) {
        const imageModel = new ImageFileModel(fullPath, this, this.sender);
        this.imageFiles.set(fullPath, imageModel);
        await imageModel.load();
        items.push({
          name: entry.name,
          path: fullPath,
          isDirectory: false
        });
      }
    }

    console.log('[Main] DirectoryModel load: Directory Ready', {
      path: this.dirPath,
      items
    });
    
    this.send(IPC_CHANNELS.DIRECTORY_READY, {
      path: this.dirPath,
      items
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