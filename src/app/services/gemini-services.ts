// services/gemini-services.ts
import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable({
  providedIn: 'root'
})
export class GeminiService {
  private genAI: any;
  private model: any;

  constructor() {
    // Hardcode API key terus (TAPI TAK SELAMAT untuk production)
    const API_KEY = 'AIzaSyCbjsAOYd--pZgyo2nnNMHdBKccv4DIAjA';  // <-- PASTE API KEY ANDA DI SINI
    
    this.genAI = new GoogleGenerativeAI(API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    });
  }

  getModel() {
    return this.model;
  }
}