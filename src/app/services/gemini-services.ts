// src/app/services/gemini-services.ts
import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable({ providedIn: 'root' })
export class GeminiService {
  // Pastikan tiada ruang kosong (space) sebelum/selepas key
  private readonly API_KEY = 'AIzaSyDlFjvChjdTkTmmuFnzCUHwncYnA1RdVsg';
  private genAI = new GoogleGenerativeAI(this.API_KEY);

  getModel() {
    try {
      // Kita cuba 'gemini-1.5-flash-latest' kerana ia paling serasi dengan v1beta
      // Gantikan 'gemini-1.5-flash-latest' kepada ini:
      return this.genAI.getGenerativeModel({ model: 'gemini-1.0-pro' });
    } catch (e) {
      console.error('Model Init Error:', e);
      return null;
    }
  }
}
