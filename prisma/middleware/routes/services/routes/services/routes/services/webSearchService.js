import axios from 'axios';

class WebSearchService {
  constructor() {
    this.tavilyApiKey = process.env.TAVILY_API_KEY;
  }

  async search(query) {
    try {
      if (!this.tavilyApiKey) {
        throw new Error('Clé API Tavily non configurée');
      }

      const response = await axios.post('https://api.tavily.com/search', {
        api_key: this.tavilyApiKey,
        query: query,
        search_depth: 'basic',
        include_images: false,
        include_answers: true,
        max_results: 5
      });

      const results = response.data;

      // Formater le contexte pour l'IA
      const context = results.results.map((result, index) => 
        `[Source ${index + 1}] ${result.title}: ${result.content}`
      ).join('\n\n');

      return {
        success: true,
        query,
        results: results.results,
        context,
        answer: results.answer
      };

    } catch (error) {
      console.error('Erreur recherche web:', error);
      
      // Fallback sans recherche web
      return {
        success: false,
        query,
        results: [],
        context: '',
        error: 'Recherche web non disponible'
      };
    }
  }
}

export default new WebSearchService();
