import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private platformId = inject(PLATFORM_ID);

  // ⚠️ TODO: Di chuyển credentials sang backend khi code backend xong
  private cloudName = 'dctej40r7';
  private apiKey = '759286942245343';
  private apiSecret = 'qJicmBPoEEgM7qNLiLdMTsKMhqM';
  private uploadUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;

  /**
   * Upload image file to Cloudinary.
   * Returns the secure_url of the uploaded image.
   */
  async uploadImage(file: File, folder: string = 'unitask'): Promise<string> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('Upload chỉ hoạt động trên trình duyệt');
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = await this.generateSignature(paramsToSign);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', this.apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);

    const response = await fetch(this.uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Upload thất bại (${response.status})`);
    }

    const data = await response.json();
    return data.secure_url;
  }

  /**
   * Generate SHA-1 signature for Cloudinary signed upload.
   * Uses the Web Crypto API (available in modern browsers & localhost).
   */
  private async generateSignature(paramsString: string): Promise<string> {
    const message = paramsString + this.apiSecret;
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
