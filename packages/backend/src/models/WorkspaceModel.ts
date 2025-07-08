import { WebContents } from 'electron';
import { DirectoryModel } from './DirectoryModel';
import { ImageFileModel } from './ImageFileModel';
import { BaseModel } from './BaseModel';
import { IPC_CHANNELS } from '@workspace/shared';

export class WorkspaceModel extends BaseModel {
  public rootDir: DirectoryModel | null = null;
  public currentImage: ImageFileModel | null = null;

  constructor(sender: WebContents) {
    super(sender);
  }

  public override async load(): Promise<void> {
    console.log('[Main] WorkspaceModel load called');

    // TODO: Eventually update to accept a path from the UI by default or populate from an sqlite db
    this.rootDir = new DirectoryModel('/Users/albchu/vicky_family_photos', this.sender);
    this.send(IPC_CHANNELS.DIRECTORY_UPDATED, { path: this.rootDir.path });
    await this.rootDir.load();
  }

  public async loadImage(imagePath: string): Promise<void> {
    // const imageModel = await this.rootDir.loadImage(imagePath);
    // this.currentImage = imageModel;
  }
} 