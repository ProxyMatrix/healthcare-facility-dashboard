import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const BUCKET = process.env.MINIO_BUCKET;

// forcePathStyle WAJIB true untuk MinIO: tanpa ini, AWS SDK memakai gaya
// "virtual-hosted" (https://<bucket>.<endpoint>/key) seperti AWS S3 asli,
// yang tidak didukung MinIO self-hosted — MinIO butuh gaya "path"
// (https://<endpoint>/<bucket>/key).
const s3Client = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT,
  forcePathStyle: true,
  // MinIO tidak memakai konsep region sungguhan, tapi AWS SDK v3 mewajibkan
  // field ini diisi — nilainya diabaikan oleh MinIO.
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER,
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD,
  },
});

/**
 * ensureBucket() — pastikan bucket foto dokter ada, buat kalau belum, dan
 * pasang policy publik-read (hanya GetObject) supaya foto bisa diakses
 * langsung oleh browser pasien tanpa autentikasi. Aman dipanggil berulang
 * (idempoten) — dipakai juga oleh /api/health sebagai cek konektivitas
 * ke MinIO.
 */
export async function ensureBucket() {
  try {
    await s3Client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    return;
  } catch (error) {
    const statusCode = error?.$metadata?.httpStatusCode;
    const isBucketMissing = statusCode === 404 || error?.name === "NotFound";

    if (!isBucketMissing) {
      // Error lain (mis. MinIO tidak bisa dihubungi, kredensial salah) —
      // JANGAN ditelan, lempar supaya pemanggil (mis. health check) tahu
      // storage benar-benar bermasalah, bukan cuma "bucket belum ada".
      throw error;
    }
  }

  await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET }));
  await s3Client.send(
    new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: "*",
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${BUCKET}/*`],
          },
        ],
      }),
    })
  );
}

/**
 * uploadObject(key, body, contentType) — unggah foto dokter ke MinIO.
 * `body` boleh Buffer/Uint8Array (hasil arrayBuffer() dari file upload).
 *
 * Memanggil ensureBucket() lebih dulu — TIDAK boleh berasumsi bucket sudah
 * ada. Tanpa ini, upload pertama kali di sebuah instalasi baru akan gagal
 * dengan error "NoSuchBucket" kalau kebetulan belum ada request lain (mis.
 * /api/health) yang sempat membuat bucket-nya duluan. HeadBucketCommand di
 * dalam ensureBucket() murah (satu request ringan), jadi aman dipanggil di
 * setiap upload.
 */
export async function uploadObject(key, body, contentType) {
  await ensureBucket();

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return key;
}

/**
 * deleteObject(key) — hapus foto lama dari MinIO (dipanggil saat dokter
 * dihapus atau fotonya diganti). Aman dipanggil dengan key kosong/null.
 */
export async function deleteObject(key) {
  if (!key) return;
  await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * getPublicUrl(key) — ubah object key MinIO (mis. "doctors/abc-andi.jpg")
 * jadi URL publik yang bisa diakses browser pasien. SELALU pakai
 * MINIO_PUBLIC_ENDPOINT (bukan MINIO_ENDPOINT yang hanya bisa diakses
 * antar-container Docker) — lihat CLAUDE.md bagian 5 poin 3: photoKey
 * menyimpan object key, bukan URL penuh, supaya kalau domain berubah tidak
 * perlu migrasi data.
 */
export function getPublicUrl(key) {
  if (!key) return null;

  const base = (process.env.MINIO_PUBLIC_ENDPOINT || "").replace(/\/+$/, "");

  return `${base}/${BUCKET}/${key}`;
}
