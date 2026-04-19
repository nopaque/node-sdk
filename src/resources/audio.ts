import { promises as fsp } from 'node:fs';
import { Resource } from '../resource.js';
import type { RequestOptions } from '../requestOptions.js';
import { Paginator, Page } from '../pagination.js';
import { readBytes, s3Get, s3Put, sniffContentType } from '../s3.js';
import type {
  AudioDownloadURL,
  AudioFile,
  AudioListParams,
  AudioUploadURL,
  CreateUploadUrlRequest,
  DownloadOptions,
  UploadInput,
} from '../types/audio.js';

export class AudioResource extends Resource {
  list(params: AudioListParams = {}, requestOptions?: RequestOptions): Paginator<AudioFile> {
    return new Paginator<AudioFile>({
      fetchPage: async (p) =>
        await this.transport.request('GET', '/audio', {
          params: p,
          requestOptions,
        }),
      params: { ...params },
    });
  }

  async listPage(
    params: AudioListParams = {},
    requestOptions?: RequestOptions
  ): Promise<Page<AudioFile>> {
    const raw = await this.transport.request<{
      items: AudioFile[];
      nextToken: string | null;
    }>('GET', '/audio', { params, requestOptions });
    return new Page(raw.items, raw.nextToken);
  }

  async get(audioId: string, requestOptions?: RequestOptions): Promise<AudioFile> {
    return await this.transport.request('GET', `/audio/${audioId}`, { requestOptions });
  }

  async delete(audioId: string, requestOptions?: RequestOptions): Promise<void> {
    await this.transport.request('DELETE', `/audio/${audioId}`, { requestOptions });
  }

  async createUploadUrl(
    body: CreateUploadUrlRequest,
    requestOptions?: RequestOptions
  ): Promise<AudioUploadURL> {
    return await this.transport.request('POST', '/audio/upload-url', {
      body,
      requestOptions,
    });
  }

  async createDownloadUrl(
    audioId: string,
    requestOptions?: RequestOptions
  ): Promise<AudioDownloadURL> {
    return await this.transport.request('GET', '/audio/download-url', {
      params: { audioId },
      requestOptions,
    });
  }

  async upload(input: UploadInput, requestOptions?: RequestOptions): Promise<AudioFile> {
    const { bytes, inferredName } = await readBytes(input.file);
    const resolvedName = input.name ?? inferredName ?? 'upload.bin';
    const resolvedType = input.contentType ?? sniffContentType(resolvedName);

    const presign = await this.createUploadUrl(
      { fileName: resolvedName, contentType: resolvedType },
      requestOptions
    );

    await s3Put(presign.uploadUrl, bytes, {
      contentType: resolvedType,
      fetch: this.transport.config.fetch,
    });
    return await this.get(presign.audioId, requestOptions);
  }

  async download(audioId: string): Promise<Uint8Array>;
  async download(audioId: string, options: DownloadOptions & { to: string }): Promise<void>;
  async download(
    audioId: string,
    options?: DownloadOptions,
    requestOptions?: RequestOptions
  ): Promise<Uint8Array | void> {
    const presign = await this.createDownloadUrl(audioId, requestOptions);
    const bytes = await s3Get(presign.downloadUrl, { fetch: this.transport.config.fetch });
    if (options?.to) {
      await fsp.writeFile(options.to, bytes);
      return;
    }
    return bytes;
  }
}
