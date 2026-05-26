import * as UslLogic from './uslLogic';

export const USL_GAME_DICTIONARY = {
  "easy": [
    "КІТ", "ДІМ", "СІК", "МАК", "ЛАК", "НІЧ", "ОКО", "РІК", "ЧАС", "ЛІС",
    "МИЛО", "КУБ", "ХОР", "СИН", "МИР", "ДАР", "БІК", "ДУБ", "ЗУБ", "КИТ",
    "ЛІД", "МЕД", "ПАР", "РАБ", "САД", "ТИП", "ФОН", "ШАХ", "ЮРБ", "ЯМА",
    "БУК", "ВІЗ", "ГАЗ", "ЖУК", "ЙОД", "КУТ", "ЛУК", "МЯЧ", "НІС", "ОСА"
  ],
  "medium": [
    "ВОДА", "ХЛІБ", "РУКА", "МОВА", "НЕБО", "МОРЕ", "ПОЛЕ", "ДУША", "ГОРА", "ЗОРЯ",
    "КЛЮЧ", "ЛИСТ", "КРАЙ", "СВІТ", "ДЕНЬ", "КРИК", "СЛІД", "МЕТА", "УРОК", "ПЛАН",
    "СИЛА", "КАША", "КІНО", "ЛАВА", "МАМА", "ТАТО", "ПИВО", "РИБА", "СОВА", "ТЕМА",
    "УРЯД", "ФОТО", "ХАТА", "ЦІНА", "ЧАША", "ШАФА", "ЮШКА", "ЯЙЦЕ", "ВІРА", "ГІСТЬ"
  ],
  "hard": [
    "ЗЕМЛЯ", "КНИГА", "ШКОЛА", "ПІСНЯ", "СЛОВО", "ЖИТТЯ", "ОКЕАН", "РАНОК", "ВЕЧІР", "МІСТО",
    "ТЕПЛО", "КРАСА", "ПРАЦЯ", "УСПІХ", "ГЕРОЙ", "ДУМКА", "КВІТКА", "ПТАХА", "РІЧКА", "СОНЦЕ",
    "ТРАВА", "ХВИЛЯ", "МАСКА", "КАЗКА", "ЧИСЛО", "СЦЕНА", "ГРУПА", "ВІДЕО", "ФОРМА", "ОБРАЗ",
    "ЕКРАН", "КАРТА", "МАРКА", "ПАПІР", "СПОРТ", "ТЕКСТ", "ФРОНТ", "ШЛЯХА", "ЯКІРЬ", "ГРОШІ"
  ]
};

/**
 * WordBuildingGame
 * A state-machine based manager for USL educational games.
 * Sequentially prompts for gestures to build words.
 */
export class WordBuildingGame {
  constructor(difficulty = 'easy') {
    this.difficulty = difficulty;
    this.wordVocabulary = USL_GAME_DICTIONARY[difficulty] || USL_GAME_DICTIONARY.easy;
    this.remainingWords = [];
    this.currentWord = '';
    this.currentLetterIndex = 0;
    this.gameState = 'IDLE'; // IDLE, PLAYING, COMPLETED
    this.displayWord = [];
    this.lastFeedback = 'Натисніть СТАРТ для початку гри';

    this.validatorMap = {
      'А': UslLogic.checkA,
      'Б': UslLogic.checkB,
      'В': UslLogic.checkV,
      'Г': UslLogic.checkG,
      'Ґ': UslLogic.checkGE,
      'Д': UslLogic.checkD,
      'Е': UslLogic.checkE,
      'Є': UslLogic.checkYE,
      'Ж': UslLogic.checkZH,
      'З': UslLogic.checkZ,
      'І': UslLogic.checkI,
      'И': UslLogic.checkYI,
      'Й': UslLogic.checkYJ,
      'Ї': UslLogic.checkYI_DoubleDot,
      'К': UslLogic.checkK,
      'Т': UslLogic.checkT,
      'Х': UslLogic.checkX,
      'Ф': UslLogic.checkF,
      'О': UslLogic.checkO,
      'У': UslLogic.checkU,
      'М': UslLogic.checkM,
      'Н': UslLogic.checkN,
      'С': UslLogic.checkC,
      'Л': UslLogic.checkL,
      'П': UslLogic.checkP,
      'Ш': UslLogic.checkSH,
      'Щ': UslLogic.checkSHCH,
      'Ц': UslLogic.checkTSE,
      'Р': UslLogic.checkR,
      'Ч': UslLogic.checkCH,
      'Ю': UslLogic.checkYU,
      'Я': UslLogic.checkYA,
      'Ь': UslLogic.checkSOFT
    };
  }

  /**
   * Shuffles the vocabulary and prepares the queue
   */
  _refreshWordQueue() {
    this.remainingWords = [...this.wordVocabulary]
      .sort(() => Math.random() - 0.5);
  }

  /**
   * Initializes a new word and resets state.
   * Guarantees a new word until vocabulary is exhausted.
   */
  startNextWord() {
    if (this.remainingWords.length === 0) {
      this._refreshWordQueue();
    }

    // Pop the next word from the shuffled queue
    this.currentWord = this.remainingWords.pop();
    this.currentLetterIndex = 0;
    this.displayWord = new Array(this.currentWord.length).fill('_');
    this.gameState = 'PLAYING';
    this.lastFeedback = `Покажіть літеру: ${this.currentWord[0]}`;
    
    // Ensure all dynamic trackers are fresh
    UslLogic.resetTrackers();
  }

  /**
   * Main update loop called with every frame of landmarks
   */
  updateGame(landmarks) {
    // Step 1: Status Verification
    if (this.gameState !== 'PLAYING') {
      return this.getUIState();
    }

    // Step 2: Dynamic Letter Check
    const targetLetter = this.currentWord[this.currentLetterIndex];
    const validator = this.validatorMap[targetLetter];

    if (!validator) {
      console.warn(`No validator found for letter: ${targetLetter}`);
      return this.getUIState();
    }

    // Step 3: Execution
    const result = validator(landmarks);

    // If result.isCorrect is true, we treat it as { detected: true } per requirement
    if (result && result.isCorrect) {
      // Advance the state!
      this.displayWord[this.currentLetterIndex] = targetLetter;
      this.currentLetterIndex++;

      // Clear dynamic trackers associated with the previous letter
      UslLogic.resetTrackers();

      // Check Win Condition
      if (this.currentLetterIndex === this.currentWord.length) {
        this.gameState = 'COMPLETED';
        this.lastFeedback = 'Чудово! Ви зібрали слово!';
        return this.getUIState(true);
      } else {
        const nextLetter = this.currentWord[this.currentLetterIndex];
        this.lastFeedback = `Правильно! Тепер покажіть: ${nextLetter}`;
      }
    } else if (result) {
      // Generic feedback for the game instead of technical hints
      this.lastFeedback = 'Продовжуйте намагатися...';
    }

    return this.getUIState();
  }

  /**
   * Generates a clean UI state object for the frontend to render
   */
  getUIState(triggerConfetti = false) {
    const targetLetter = this.currentWord[this.currentLetterIndex] || '';
    
    return {
      gameState: this.gameState,
      wordDisplay: this.displayWord.join(' '),
      currentPrompt: this.gameState === 'PLAYING' 
        ? `Покажи літеру: ${targetLetter}` 
        : (this.gameState === 'COMPLETED' ? 'Слово зібрано!' : 'Натисніть СТАРТ'),
      feedbackMessage: this.lastFeedback,
      isWordFinished: this.gameState === 'COMPLETED',
      triggerConfetti: triggerConfetti
    };
  }
}
