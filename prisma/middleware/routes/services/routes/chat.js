import express from 'express';
import auth from '../middleware/auth.js';
import mistralService from '../services/mistralService.js';
import webSearchService from '../services/webSearchService.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Envoyer un message
router.post('/send', auth, async (req, res) => {
  try {
    const { message, conversationId, isTemp = false, useWebSearch = false } = req.body;
    const userId = req.user.id;

    let conversation;
    let conversationTitle = '';

    // Créer ou récupérer la conversation
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId }
      });
    } else {
      conversationTitle = message.slice(0, 50) + (message.length > 50 ? '...' : '');
      conversation = await prisma.conversation.create({
        data: {
          title: conversationTitle,
          userId,
          isTemp
        }
      });
    }

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation non trouvée' });
    }

    // Sauvegarder le message utilisateur
    await prisma.message.create({
      data: {
        content: message,
        role: 'user',
        conversationId: conversation.id
      }
    });

    // Récupérer l'historique des messages
    const previousMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 10
    });

    const messagesForAI = previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // Recherche web si activée
    let webContext = '';
    if (useWebSearch) {
      try {
        const searchResults = await webSearchService.search(message);
        webContext = searchResults.context;
      } catch (error) {
        console.error('Erreur recherche web:', error);
      }
    }

    // Ajouter le contexte web aux messages
    if (webContext) {
      messagesForAI.unshift({
        role: 'system',
        content: `Informations web récentes: ${webContext}`
      });
    }

    // Récupérer les paramètres utilisateur
    const userSettings = await prisma.userSettings.findUnique({
      where: { userId }
    });

    // Configurer le streaming
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    let fullResponse = '';

    // Appeler Mistral avec streaming
    await mistralService.streamChatCompletion(
      messagesForAI,
      (chunk) => {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk, type: 'chunk' })}\n\n`);
      },
      {
        model: userSettings?.aiModel || 'mistral-medium',
        temperature: userSettings?.temperature || 0.7,
        maxTokens: userSettings?.maxTokens || 2000
      }
    );

    // Sauvegarder la réponse de l'IA
    await prisma.message.create({
      data: {
        content: fullResponse,
        role: 'assistant',
        conversationId: conversation.id
      }
    });

    // Mettre à jour le titre si nouvelle conversation
    if (!conversationId && fullResponse) {
      const newTitle = fullResponse.slice(0, 30) + (fullResponse.length > 30 ? '...' : '');
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { title: newTitle }
      });
    }

    // Mettre à jour le timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() }
    });

    res.end();

  } catch (error) {
    console.error('Erreur chat:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Récupérer les conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { 
        userId: req.user.id,
        isTemp: false 
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    res.json({ conversations });
  } catch (error) {
    console.error('Erreur récupération conversations:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Chat temporaire
router.post('/temp-chat', async (req, res) => {
  try {
    const { message } = req.body;

    const response = await mistralService.chatCompletion([
      { role: 'user', content: message }
    ], {
      model: 'mistral-medium',
      temperature: 0.7
    });

    res.json({
      response: response.choices[0].message.content,
      temporary: true,
      note: 'Conversation non sauvegardée'
    });

  } catch (error) {
    console.error('Erreur chat temporaire:', error);
    res.status(500).json({ error: 'Erreur lors de la génération' });
  }
});

export default router;
