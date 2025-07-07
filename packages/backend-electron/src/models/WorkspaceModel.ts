import { WebContents } from 'electron';
import { DirectoryModel } from './DirectoryModel';
import { ImageFileModel } from './ImageFileModel';
import { BaseModel } from './BaseModel';

export class WorkspaceModel extends BaseModel {
  public rootDir: DirectoryModel;
  public currentImage: ImageFileModel | null = null;

  constructor(public rootPath: string, sender: WebContents) {
    super(sender);
    this.rootDir = new DirectoryModel(rootPath, sender);
  }

  public override async load(): Promise<void> {
    await this.rootDir.load();
  }

  public async loadImage(imagePath: string): Promise<void> {
    const imageModel = await this.rootDir.loadImage(imagePath);
    this.currentImage = imageModel;
  }
} 