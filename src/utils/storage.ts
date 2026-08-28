import {
    DeleteObjectCommand,
    PutObjectCommand,
  } from "@aws-sdk/client-s3";
  
  import crypto from "crypto";
  
  import storageClient from "../config/storage.js";
  
  const bucket =
    process.env.SUPABASE_S3_BUCKET!;
  
  // ============================================================
  // UPLOAD FILE
  // ============================================================
  
  export const uploadToStorage = async (
    fileBuffer: Buffer,
    objectKey: string,
    contentType: string,
  ) => {
    await storageClient.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: contentType,
      }),
    );
  
    return objectKey;
  };
  
  // ============================================================
  // DELETE FILE
  // ============================================================
  
  export const deleteFromStorage = async (
    objectKey: string,
  ) => {
    await storageClient.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: objectKey,
      }),
    );
  };
  
  // ============================================================
  // GENERATE STORAGE KEY
  // ============================================================
  
  export const generateStorageKey = (
    folder: string,
    originalFileName: string,
  ) => {
    const extension =
      originalFileName
        .substring(
          originalFileName.lastIndexOf("."),
        );
  
    const uniqueName =
      `${Date.now()}-${crypto.randomUUID()}${extension}`;
  
    return `${folder}/${uniqueName}`;
  };