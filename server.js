const express = require('express');
const Kahoot = require('kahoot.js-latest');
const { Client: BlooketClient } = require('blooketjs');

const app = express();
app.use(express.json());

let activeBots = [];

app.post('/control', (req, res) => {
  const { action, platform, gamePin, botName, botCount } = req.body;

  if (action === 'start') {
    if (activeBots.length > 0) {
      return res.json({ status: "Bots are already running!" });
    }

    const count = Math.min(Math.max(parseInt(botCount, 10) || 1, 1), 50);
    const baseName = botName || "Bot";
    const selectedPlatform = (platform || "kahoot").toLowerCase();

    for (let i = 1; i <= count; i++) {
      const currentName = count === 1 ? baseName : `${baseName}_${i}`;

      if (selectedPlatform === 'kahoot') {
        const bot = new Kahoot();
        bot.join(gamePin, currentName)
          .then(() => console.log(`[Kahoot] Bot ${currentName} joined game ${gamePin}`))
          .catch((err) => console.error(`[Kahoot] ${currentName} failed to join:`, err));

        bot.on("QuestionStart", (question) => {
          if (question.choices && Array.isArray(question.choices)) {
            const correctIndex = question.choices.findIndex(choice => choice.correct === true);
            if (correctIndex !== -1) {
              question.answer(correctIndex);
              return;
            }
          }
          const totalChoices = question.quizQuestionAnswers || 4;
          question.answer(Math.floor(Math.random() * totalChoices));
        });

        activeBots.push({ client: bot, platform: 'kahoot' });

      } else if (selectedPlatform === 'blooket') {
        try {
          const bot = new BlooketClient();
          bot.join(gamePin, currentName)
            .then(() => console.log(`[Blooket] Bot ${currentName} joined game ${gamePin}`))
            .catch((err) => console.error(`[Blooket] ${currentName} failed to join:`, err));

          activeBots.push({ client: bot, platform: 'blooket' });
        } catch (err) {
          console.error(`[Blooket] Error initializing bot ${currentName}:`, err);
        }
      }
    }

    return res.json({ status: `Launched ${count} ${selectedPlatform} bot(s) for PIN: ${gamePin}` });

  } else if (action === 'stop') {
    if (activeBots.length > 0) {
      activeBots.forEach(item => {
        try {
          if (item.client && typeof item.client.leave === 'function') {
            item.client.leave();
          }
        } catch (e) {
          // Ignore disconnect errors
        }
      });

      const disconnectedCount = activeBots.length;
      activeBots = [];
      return res.json({ status: `Disconnected ${disconnectedCount} bot(s).` });
    }
    return res.json({ status: "No active bots found." });
  }

  res.status(400).json({ error: "Invalid action" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
