import express from 'express';
import auth from '../middleware/auth.js';
import voiceService from '../services/voiceService.js';

const router = express.Router();

// Obtenir les voix disponibles
router.get('/voices', auth, (req, res) => {
  try {
    const { language = 'fr-FR' } = req.query;
    const voices = voiceService.getAvailableVoices(language);
    
    res.json({ voices });
  } catch (error) {
    console.error('Erreur récupération voix:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Synthèse vocale (texte → parole)
router.post('/text-to-speech', auth, async (req, res) => {
  try {
    const { text, language = 'fr-FR', voice } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Texte manquant' });
    }

    const result = await voiceService.textToSpeech(text, language, voice);
    
    res.json(result);
  } catch (error) {
    console.error('Erreur synthèse vocale:', error);
    res.status(500).json({ error: 'Erreur de synthèse vocale' });
  }
});

// Reconnaissance vocale (parole → texte)
router.post('/speech-to-text', auth, async (req, res) => {
  try {
    const { audio, language = 'fr-FR' } = req.body;

    if (!audio) {
      return res.status(400).json({ error: 'Audio manquant' });
    }

    const result = await voiceService.speechToText(audio, language);
    
    res.json(result);
  } catch (error) {
    console.error('Erreur reconnaissance vocale:', error);
    res.status(500).json({ error: 'Erreur de reconnaissance vocale' });
  }
});

export default router;
