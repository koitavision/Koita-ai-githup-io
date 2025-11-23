import axios from 'axios';

class WebSearchService {
  constructor() {
    this.serperApiKey = process.env.SERPER_API_KEY;
  }

  async search(query) {
    try {
      if (!this.serperApiKey) {
        console.log('⚠️ Recherche web désactivée - Clé Serper manquante');
        return {
          success: false,
          query,
          results: [],
          context: '',
          error: 'Recherche web non configurée'
        };
      }

      const response = await axios.post('https://google.serper.dev/search', {
        q: query,
        num: 5
      }, {
        headers: {
          'X-API-KEY': this.serperApiKey,
          'Content-Type': 'application/json'
        }
      });

      const results = response.data;

      // Formater le contexte pour l'IA
      const context = results.organic.map((result, index) => 
        `[Source ${index + 1}] ${result.title}: ${result.snippet}`
      ).join('\n\n');

      return {
        success: true,
        query,
        results: results.organic,
        context,
        answer: results.answerBox?.answer || ''
      };

    } catch (error) {
      console.error('Erreur recherche web:', error);
      
      return {
        success: false,
        query,
        results: [],
        context: '',
        error: 'Erreur lors de la recherche web'
      };
    }
  }
}

export default new WebSearchService();
