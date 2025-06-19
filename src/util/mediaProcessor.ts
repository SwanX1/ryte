import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export class MediaProcessor {
  /**
   * Convert image to WebP format
   */
  static async convertImageToWebP(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-c:v', 'libwebp',
        '-quality', '80',
        '-y',
        outputPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (err) => {
        reject(err);
      });

      ffmpeg.stderr.on('data', (data) => {
        // console.log(`FFmpeg stderr: ${data}`); ignore, since this also outputs warnings
      });
    });
  }

  /**
   * Convert video to WebM format
   */
  static async convertVideoToWebM(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-c:v', 'libvpx-vp9',
        '-c:a', 'libopus',
        '-crf', '30',
        '-b:v', '0',
        '-pix_fmt', 'yuv420p',
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
        '-y',
        outputPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (err) => {
        reject(err);
      });

      ffmpeg.stderr.on('data', (data) => {
        // console.log(`FFmpeg stderr: ${data}`); ignore, since this also outputs warnings
      });
    });
  }

  /**
   * Process uploaded file and convert to appropriate format
   */
  static async processFile(file: Express.Multer.File): Promise<string> {
    const uploadsDir = path.join(process.cwd(), 'src', 'public', 'uploads');
    const originalPath = path.join(uploadsDir, file.filename);
    const baseName = path.parse(file.filename).name;

    try {
      if (file.mimetype.startsWith('image/')) {
        // Convert image to WebP
        const webpFilename = `${baseName}.webp`;
        const webpPath = path.join(uploadsDir, webpFilename);
        
        await this.convertImageToWebP(originalPath, webpPath);
        
        // Remove original file
        fs.unlinkSync(originalPath);
        
        return webpFilename;
      } else if (file.mimetype.startsWith('video/')) {
        // Convert video to WebM
        const webmFilename = `${baseName}.webm`;
        const webmPath = path.join(uploadsDir, webmFilename);
        
        await this.convertVideoToWebM(originalPath, webmPath);
        
        // Remove original file
        fs.unlinkSync(originalPath);
        
        return webmFilename;
      } else {
        // For unsupported types, return original filename
        return file.filename;
      }
    } catch (error) {
      console.error('Error processing file:', error);
      // If conversion fails, return original filename
      return file.filename;
    }
  }

  /**
   * Process multiple files
   */
  static async processFiles(files: Express.Multer.File[]): Promise<string[]> {
    const processedFilenames = await Promise.all(
      files.map(file => this.processFile(file))
    );
    return processedFilenames;
  }
} 