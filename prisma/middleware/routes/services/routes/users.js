import express from 'express';
import auth from '../middleware/auth.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Récupérer le profil utilisateur
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        userSettings: true,
        conversations: {
          orderBy: { updatedAt: 'desc' },
          take: 5
        }
      }
    });

    res.json({ 
      user,
      welcome: `Bonjour ${user.firstName} ${user.lastName} ! Bienvenue sur Mistral AI Chat.`
    });
  } catch (error) {
    console.error('Erreur récupération profil:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Mettre à jour les paramètres
router.put('/settings', auth, async (req, res) => {
  try {
    const { settings } = req.body;

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      update: settings,
      create: {
        userId: req.user.id,
        ...settings
      }
    });

    res.json({ 
      success: true,
      settings: updatedSettings,
      message: 'Paramètres mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur mise à jour paramètres:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Mettre à jour le profil
router.put('/profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, avatar } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName,
        lastName,
        avatar
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true
      }
    });

    res.json({ 
      success: true,
      user,
      message: 'Profil mis à jour avec succès'
    });
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

export default router;
