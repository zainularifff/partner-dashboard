import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  // Menggunakan API Key yang anda berikan
  private readonly API_KEY = 'AIzaSyBBXREgYXQeJUjlDxbJFv-0CInFzr5eniU'; 
  private genAI = new GoogleGenerativeAI(this.API_KEY);

  constructor() {}

  /**
   * Memanggil model Gemini 1.5 Flash untuk analisis pantas.
   * Pastikan akaun anda mempunyai akses kepada model ini di AI Studio.
   */
  getModel() {
    try {
      return this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    } catch (error) {
      console.error('Failed to initialize Gemini model:', error);
      return null;
    }
  }
}