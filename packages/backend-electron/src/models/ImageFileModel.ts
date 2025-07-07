import fs from 'fs/promises';
import { WebContents } from 'electron';
import { Image } from 'image-js';
import { BaseModel } from './BaseModel';
import { DirectoryModel } from './DirectoryModel';
import { IPC_CHANNELS } from '@workspace/shared';

export class ImageFileModel extends BaseModel {
  public image: Image | null = null;
  public base64: string | null = null;

  constructor(
    public path: string,
    public parentDir: DirectoryModel,
    sender: WebContents
  ) {
    super(sender);
  }

  public override async load(): Promise<void> {
    const buffer = await fs.readFile(this.path);
    const img = await Image.load(buffer);
    this.image = img;
    this.base64 = img.toDataURL();

    this.send(IPC_CHANNELS.IMAGE_READY, {
      path: this.path,
      dataUrl: this.base64,
      width: img.width,
      height: img.height,
    });
  }
} 