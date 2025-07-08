import { WebContents } from 'electron';
import { sendToRenderer } from '../utils/sendToRenderer';

export abstract class BaseModel {
  protected sender: WebContents;

  constructor(sender: WebContents) {
    this.sender = sender;
  }

  public async load(): Promise<void> {
    console.log(`[BaseModel] No-op load() called on ${this.constructor.name}`);
  }

  protected send<T>(channel: string, payload: T): void {
    sendToRenderer(this.sender, channel, payload);
  }
} 