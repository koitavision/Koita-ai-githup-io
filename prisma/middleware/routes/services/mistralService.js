import axios from 'axios';

class MistralService {
  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY;
    this.baseURL = 'https://api.mistral.ai/v1';
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async chatCompletion(messages, options = {}) {
    try {
      const {
        model = 'mistral-medium',
        temperature = 0.7,
        maxTokens = 2000,
        stream = false
      } = options;

      const response = await this.client.post('/chat/completions', {
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream
      });

      return response.data;
    } catch (error) {
      console.error('Erreur Mistral API:', error.response?.data || error.message);
      throw new Error('Erreur de communication avec Mistral AI');
    }
  }

  async streamChatCompletion(messages, onChunk, options = {}) {
    try {
      const {
        model = 'mistral-medium',
        temperature = 0.7,
        maxTokens = 2000
      } = options;

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ') && !line.includes('[DONE]')) {
            try {
              const data = JSON.parse(line.slice(6));
              const content = data.choices[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Ignorer les erreurs de parsing
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur streaming Mistral:', error);
      throw error;
    }
  }
}

export default new MistralService();
