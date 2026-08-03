import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';
import { config } from '../config';

const bucket = config.r2.bucket;
const publicUrlBase = config.r2.publicUrlBase;

let client: S3Client | null = null;

function getClient(): S3Client {
  if (!client) {
    client = new S3Client({
      region: 'auto',
      endpoint: config.r2.endpoint,
      credentials: {
        accessKeyId: config.r2.accessKeyId,
        secretAccessKey: config.r2.secretAccessKey,
      },
    });
  }
  return client;
}

export async function uploadFile(
  buffer: Buffer,
  originalName: string,
  mimeType: string,
): Promise<string> {
  const parts = originalName.split('.');
  const ext = parts.length > 1 ? parts.pop()! : (mimeType.split('/').pop() || 'bin');
  const key = `uploads/${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;

  await getClient().send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
  }));

  return `${publicUrlBase}/${key}`;
}

export async function deleteFile(url: string): Promise<void> {
  const key = url.replace(publicUrlBase + '/', '');
  await getClient().send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }));
}
