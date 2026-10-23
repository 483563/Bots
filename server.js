const express = require('express');
const Kahoot = require('kahoot.js-latest');

const app = express();
app.use(express.json());

let activeBot = null;

app.post('/control', (req, res) => {
  const { action, gamePin, botName } = req.body;

  if (action === 'start') {
    if (activeBot) return res.json({ status: "Bot is already running!" });

    activeBot = new Kahoot();

    activeBot.join(gamePin, botName || "RenderBot")
      .then(() => console.log(`Joined game ${gamePin}`))
      .catch((err) => {
        console.error("Join failed:", err);
        activeBot = null;
      });

    activeBot.on("QuestionStart", (question) => {
      const randomChoice = Math.floor(Math.random() * question.quizQuestionAnswers);
      question.answer(randomChoice);
    });

    return res.json({ status: `Bot launching for PIN: ${gamePin}` });

  } else if (action === 'stop') {
    if (activeBot) {
      activeBot.leave();
      activeBot = null;
      return res.json({ status: "Bot disconnected." });
    }
    return res.json({ status: "No active bot found." });
  }

  res.status(400).json({ error: "Invalid action" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server live on port ${PORT}`));
