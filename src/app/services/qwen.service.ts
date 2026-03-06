// src/app/services/qwen.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class QwenService {
  private ollamaUrl = 'http://localhost:11434/api/generate';
  private modelName = 'qwen2.5:7b'; // Boleh tukar: 'qwen2.5:1.5b', 'qwen2.5:3b', 'qwen2.5:7b'

  constructor(private http: HttpClient) {}

  /**
   * Generate report berdasarkan data dashboard
   */
  async generateReport(prompt: string, data: any): Promise<string> {
    const fullPrompt = `
      Anda adalah pakar analisis data untuk dashboard eksekutif nPoints™ AISM.
      
      DATA DASHBOARD (JSON):
      ${JSON.stringify(data, null, 2)}
      
      TUGASAN:
      ${prompt}
      
      Arahan penting:
      - Gunakan Bahasa Melayu atau Inggeris (ikut kesesuaian)
      - Berikan analisis yang profesional dan berstruktur
      - Sertakan nombor dan data tepat dari dashboard
      - Format output dalam markdown dengan headings, bullet points
    `;

    try {
      const response = await lastValueFrom(
        this.http.post<any>(this.ollamaUrl, {
          model: this.modelName,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: 0.7,
            top_p: 0.9,
            max_tokens: 2048
          }
        })
      );
      
      return response.response;
    } catch (error) {
      console.error('❌ Qwen error:', error);
      return this.getFallbackResponse();
    }
  }

  /**
   * Test connection dengan Ollama
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await lastValueFrom(
        this.http.post<any>(this.ollamaUrl, {
          model: this.modelName,
          prompt: 'Say "OK" if you can hear me',
          stream: false,
          options: { max_tokens: 10 }
        })
      );
      console.log('✅ Qwen connection OK:', response.response);
      return true;
    } catch (error) {
      console.error('❌ Qwen connection failed:', error);
      return false;
    }
  }

  /**
   * List available models dalam Ollama
   */
  async listModels(): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.http.get<any>('http://localhost:11434/api/tags')
      );
      return response.models || [];
    } catch (error) {
      console.error('❌ Failed to list models:', error);
      return [];
    }
  }

  /**
   * Fallback response kalau API error
   */
  private getFallbackResponse(): string {
    return `# Analisis Tidak Tersedia

Maaf, analisis AI tidak dapat dihasilkan buat masa ini. Sila pastikan:

1. Ollama sedang running (jalankan 'ollama serve' dalam terminal)
2. Model qwen2.5 telah didownload (jalankan 'ollama pull qwen2.5:7b')
3. Tiada isu rangkaian

**Sebab biasa:** Ollama service belum start atau model belum siap download.`;
  }
}