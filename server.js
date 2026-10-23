const express = require('express');
const Kahoot = require('kahoot.js-latest');

const app = express();
app.use(express.json());

let activeBots = [];

app.post('/control', (req, res) => {
  const { action, gamePin, botName, botCount } = req.body;

  if (action === 'start') {
    if (activeBots.length > 0) {
      return res.json({ status: "Bots are already running!" });
    }

    const count = Math.min(Math.max(parseInt(botCount, 10) || 1, 1), 50); // Clamped between 1 and 50
    const baseName = botName || "RenderBot";

    for (let i = 1; i <= count; i++) {
      const bot = new Kahoot();
      const currentName = count === 1 ? baseName : `${baseName}_${i}`;

      bot.join(gamePin, currentName)
        .then(() => {
          console.log(`Bot ${currentName} joined game ${gamePin}`);
        })
        .catch((err) => {
          console.error(`Bot ${currentName} failed to join:`, err);
        });

      // Answer listener incorporating Method 1
      bot.on("QuestionStart", (question) => {
        // Method 1: Check if correct answer indices are embedded in choices
        if (question.choices && Array.isArray(question.choices)) {
          const correctIndex = question.choices.findIndex(choice => choice.correct === true);
          if (correctIndex !== -1) {
            console.log(`Bot ${currentName} found correct answer at index ${correctIndex}`);
            question.answer(correctIndex);
            return;
          }
        }

        // Fallback: Pick a random answer index (0 to choice count)
        const totalChoices = question.quizQuestionAnswers || 4;
        const randomChoice = Math.floor(Math.random() * totalChoices);
        question.answer(randomChoice);
      });

      activeBots.push(bot);
    }

    return res.json({ status: `Launching ${count} bot(s) for PIN: ${gamePin}` });

  } else if (action === 'stop') {
    if (activeBots.length > 0) {
      activeBots.forEach(bot => {
        try {
          bot.leave();
        } catch (e) {
          // Ignore individual disconnect errors
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
