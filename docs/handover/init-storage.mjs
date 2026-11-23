import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const repo = path.resolve(process.argv[2] || '.');
const env = Object.fromEntries(fs.readFileSync(path.join(repo, '.env'), 'utf8').split(/\r?\n/).filter(line => /^[A-Z_]+=/.test(line)).map(line => { const i = line.indexOf('='); return [line.slice(0,i), line.slice(i+1)]; }));
const db = new URL(env.DATABASE_URL);
if (db.hostname !== '127.0.0.1' || db.port !== '15434' || db.pathname !== '/mymuse_dev'
  || env.MINIO_ENDPOINT !== '127.0.0.1:19004' || env.MINIO_BUCKET !== 'escort-media') throw Error('Only the local handover stack is accepted');
const req = createRequire(path.join(repo, 'apps/api/package.json'));
const {S3Client, CreateBucketCommand, PutBucketPolicyCommand} = req('@aws-sdk/client-s3');
const s3 = new S3Client({endpoint: 'http://127.0.0.1:19004', region: 'us-east-1', forcePathStyle: true,
  credentials: {accessKeyId: env.MINIO_ACCESS_KEY, secretAccessKey: env.MINIO_SECRET_KEY}});
try { await s3.send(new CreateBucketCommand({Bucket: 'escort-media'})); }
catch (error) { if (!['BucketAlreadyOwnedByYou','BucketAlreadyExists'].includes(error.name)) throw error; }
await s3.send(new PutBucketPolicyCommand({Bucket: 'escort-media', Policy: JSON.stringify({Version: '2012-10-17', Statement: [
  {Effect: 'Allow', Principal: '*', Action: ['s3:GetObject'], Resource: ['arn:aws:s3:::escort-media/*']},
]})}));
s3.destroy();
console.log('Local upload bucket is ready. No production object store was contacted.');
