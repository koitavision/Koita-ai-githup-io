import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Inscription
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        settings: {
          theme: 'light',
          language: 'fr'
        }
      }
    });

    // Créer les paramètres utilisateur
    await prisma.userSettings.create({
      data: {
        userId: user.id,
        theme: 'light',
        language: 'fr',
        aiModel: 'mistral-medium',
        temperature: 0.7,
        voice: 'fr-FR'
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        settings: user.settings
      }
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Connexion
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        userSettings: true
      }
    });

    if (!user) {
      return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        settings: user.userSettings
      },
      message: `Bonjour ${user.firstName} ${user.lastName} ! Bienvenue sur Mistral AI Chat.`
    });

  } catch (error) {
    console.error('Erreur connexion:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Déconnexion (côté client généralement)
router.post('/logout', (req, res) => {
  res.json({ message: 'Déconnexion réussie' });
});

export default router;
