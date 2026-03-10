const { GoogleGenerativeAI } = require('@google/generative-ai');
const geminiConfig = require('../../config/gemini');

// Models to try in order of preference
const MODEL_FALLBACKS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
  'gemini-pro',
];

/**
 * Gemini AI Service
 *
 * Singleton service for interacting with Google's Gemini AI API
 * to generate personalized learning paths.
 */
class GeminiAIService {
  constructor() {
    this.genAI = null;
    this.model = null;
    this.modelName = null;
    this.initialized = false;
  }

  /**
   * Initialize the Gemini AI client
   */
  async initialize() {
    if (this.initialized) return;

    if (!geminiConfig.validate()) {
      throw new Error('Gemini API configuration is incomplete. Check your .env file for GEMINI_API_KEY.');
    }

    this.genAI = new GoogleGenerativeAI(geminiConfig.apiKey);

    // Try to find a working model
    const modelsToTry = geminiConfig.model.name
      ? [geminiConfig.model.name, ...MODEL_FALLBACKS]
      : MODEL_FALLBACKS;

    for (const modelName of modelsToTry) {
      try {
        console.log(`🔄 Trying model: ${modelName}...`);
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: geminiConfig.model.generationConfig,
        });

        // Quick test to see if model works
        const testResult = await model.generateContent('Say "ok"');
        await testResult.response;

        this.model = model;
        this.modelName = modelName;
        this.initialized = true;
        console.log(`✅ Gemini AI Service initialized with model: ${modelName}`);
        return;
      } catch (error) {
        console.log(`⚠️ Model ${modelName} failed: ${error.message.substring(0, 100)}`);
        continue;
      }
    }

    throw new Error('No working Gemini model found. Please check your API key and try again.');
  }

  /**
   * Ensure the service is initialized before use
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Generate a learning path based on user input
   * @param {string} userInput - User's learning goal description
   * @returns {Promise<Object>} Generated learning path structure
   */
  async generateLearningPath(userInput) {
    await this.ensureInitialized();

    const prompt = this._buildPrompt(userInput);

    try {
      console.log('🤖 Generating learning path for:', userInput.substring(0, 50) + '...');

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      // Clean up the response - remove markdown code blocks if present
      text = this._extractJSON(text);

      console.log('📝 Raw response (first 200 chars):', text.substring(0, 200));

      // Parse and validate JSON response
      const learningPath = JSON.parse(text);
      return this._validateAndNormalize(learningPath);
    } catch (error) {
      console.error('❌ Gemini API Error:', error.message);

      // Handle specific error types
      if (error.message.includes('SAFETY')) {
        throw new Error('CONTENT_FILTERED: Unable to generate content for this request. Please try a different topic.');
      }

      if (error instanceof SyntaxError) {
        throw new Error('PARSE_ERROR: Failed to parse AI response. Please try again.');
      }

      throw new Error(`AI_SERVICE_ERROR: ${error.message}`);
    }
  }

  /**
   * Extract JSON from response text, removing markdown code blocks if present
   * @param {string} text - Raw response text
   * @returns {string} Clean JSON string
   */
  _extractJSON(text) {
    // Remove markdown code blocks (```json ... ``` or ``` ... ```)
    let cleaned = text.trim();

    // Pattern 1: ```json\n{...}\n```
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7); // Remove ```json
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3); // Remove ```
    }

    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3); // Remove trailing ```
    }

    // Trim any remaining whitespace
    cleaned = cleaned.trim();

    // Find the JSON object boundaries
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    return cleaned;
  }

  /**
   * Build the prompt for generating a learning path
   * @param {string} userInput - User's learning goal
   * @returns {string} Complete prompt
   */
  _buildPrompt(userInput) {
    // Sanitize user input - remove potential HTML/script tags
    const sanitizedInput = userInput
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .trim();

    return `You are an expert educational curriculum designer with years of experience creating effective learning paths. Based on the user's learning goal, generate a comprehensive and well-structured learning path.

User's Learning Goal: "${sanitizedInput}"

Generate a JSON response with this EXACT structure (no markdown, no code blocks, just pure JSON):
{
  "title": "A clear, descriptive title for the learning path (max 100 characters)",
  "description": "A 2-3 sentence overview of what the learner will achieve upon completing this path",
  "difficulty_level": "beginner OR intermediate OR advanced (choose one based on the topic complexity)",
  "estimated_duration_weeks": <total number of weeks as an integer>,
  "modules": [
    {
      "module_order": <1-based sequential number>,
      "title": "Concise module title",
      "description": "What this module covers and why it's important",
      "duration_weeks": <number of weeks for this module>,
      "topics": ["Specific Topic 1", "Specific Topic 2", "Specific Topic 3"]
    }
  ]
}

IMPORTANT Guidelines:
1. Generate 4-8 modules with logical progression from fundamentals to advanced concepts
2. Each module should have 3-5 specific, actionable topics
3. Set realistic durations: 1-4 weeks per module depending on complexity
4. Modules MUST build upon previous knowledge in a logical sequence
5. Topics should be specific enough to be searchable (e.g., "React Hooks" not just "React concepts")
6. Total estimated_duration_weeks should equal sum of all module durations
7. Choose difficulty_level based on where a beginner would start for this topic
8. Return ONLY valid JSON - no explanations, no markdown formatting

Generate the learning path now:`;
  }

  /**
   * Validate and normalize the AI response
   * @param {Object} learningPath - Raw learning path from AI
   * @returns {Object} Validated and normalized learning path
   */
  _validateAndNormalize(learningPath) {
    // Validate required top-level fields
    if (!learningPath.title || typeof learningPath.title !== 'string') {
      throw new Error('PARSE_ERROR: Missing or invalid title in AI response');
    }

    if (!learningPath.description || typeof learningPath.description !== 'string') {
      throw new Error('PARSE_ERROR: Missing or invalid description in AI response');
    }

    if (!learningPath.modules || !Array.isArray(learningPath.modules) || learningPath.modules.length === 0) {
      throw new Error('PARSE_ERROR: Missing or invalid modules in AI response');
    }

    // Normalize difficulty level
    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    if (!validDifficulties.includes(learningPath.difficulty_level?.toLowerCase())) {
      learningPath.difficulty_level = 'beginner';
    } else {
      learningPath.difficulty_level = learningPath.difficulty_level.toLowerCase();
    }

    // Ensure estimated_duration_weeks is a number
    learningPath.estimated_duration_weeks = parseInt(learningPath.estimated_duration_weeks) ||
      learningPath.modules.reduce((sum, m) => sum + (parseInt(m.duration_weeks) || 2), 0);

    // Validate and normalize each module
    learningPath.modules = learningPath.modules.map((module, index) => {
      if (!module.title) {
        throw new Error(`PARSE_ERROR: Module ${index + 1} is missing a title`);
      }

      return {
        module_order: module.module_order || index + 1,
        title: module.title.trim(),
        description: module.description?.trim() || `Learn about ${module.title}`,
        duration_weeks: parseInt(module.duration_weeks) || 2,
        topics: Array.isArray(module.topics) && module.topics.length > 0
          ? module.topics.map(t => String(t).trim()).filter(t => t.length > 0)
          : ['Introduction', 'Core Concepts', 'Practice Exercises'],
      };
    });

    // Sort modules by order
    learningPath.modules.sort((a, b) => a.module_order - b.module_order);

    // Add computed fields
    learningPath.total_modules = learningPath.modules.length;

    console.log(`✅ Generated learning path: "${learningPath.title}" with ${learningPath.total_modules} modules`);

    return learningPath;
  }

  /**
   * Suggest external courses from the internet for a module
   * @param {string} moduleTitle - Module title
   * @param {string} moduleDescription - Module description
   * @param {string[]} topics - Module topics
   * @param {string} difficultyLevel - Difficulty level
   * @returns {Promise<Array>} Array of external course suggestions
   */
  async suggestExternalCourses(moduleTitle, moduleDescription, topics, difficultyLevel) {
    await this.ensureInitialized();

    const prompt = `You are an expert educational resource curator. Given a learning module's details, suggest 5-8 real, well-known online courses from prominent educational platforms that would help a learner study this module's topics.

Module Title: "${moduleTitle}"
Module Description: "${moduleDescription}"
Topics to Cover: ${JSON.stringify(topics)}
Target Difficulty Level: "${difficultyLevel}"

Generate a JSON response with this EXACT structure (no markdown, no code blocks, just pure JSON):
{
  "suggestions": [
    {
      "title": "Exact course name as it appears on the platform",
      "platform": "Platform name (must be one of: Coursera, Udemy, edX, YouTube, Khan Academy, Pluralsight, LinkedIn Learning, freeCodeCamp, MIT OpenCourseWare, Codecademy)",
      "url": "Direct URL to the course page (use real, plausible URLs)",
      "description": "1-2 sentence description of what the course covers and why it matches",
      "estimated_duration": "e.g., '4 hours', '2 weeks', '30 minutes'",
      "difficulty_level": "beginner, intermediate, or advanced",
      "is_free": true or false
    }
  ]
}

IMPORTANT Guidelines:
1. Suggest REAL, well-known courses that actually exist on these platforms
2. Include a mix of free and paid options
3. Include at least one YouTube channel/playlist and one free option
4. URLs should be realistic (e.g., https://www.coursera.org/learn/course-name, https://www.udemy.com/course/course-name)
5. Prioritize courses with high ratings and good instructor reputation
6. Match the difficulty level to the module's target level
7. Each suggestion should cover at least some of the listed topics
8. Return ONLY valid JSON - no explanations, no markdown formatting`;

    try {
      console.log('🌐 Suggesting external courses for:', moduleTitle);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = this._extractJSON(text);

      const parsed = JSON.parse(text);

      if (!parsed.suggestions || !Array.isArray(parsed.suggestions)) {
        throw new Error('PARSE_ERROR: Invalid suggestions format');
      }

      return parsed.suggestions.map(s => ({
        title: s.title || 'Untitled Course',
        platform: s.platform || 'Unknown',
        url: s.url || '#',
        description: s.description || '',
        estimated_duration: s.estimated_duration || 'Unknown',
        difficulty_level: s.difficulty_level || difficultyLevel,
        is_free: typeof s.is_free === 'boolean' ? s.is_free : true
      }));
    } catch (error) {
      console.error('❌ External course suggestion error:', error.message);

      if (error.message.includes('SAFETY')) {
        throw new Error('CONTENT_FILTERED: Unable to generate suggestions for this topic.');
      }

      if (error instanceof SyntaxError) {
        throw new Error('PARSE_ERROR: Failed to parse AI suggestions. Please try again.');
      }

      throw new Error(`AI_SERVICE_ERROR: ${error.message}`);
    }
  }
  /**
   * Generate assessment questions using AI
   * @param {string} topic - The topic/subject for questions
   * @param {number} numberOfQuestions - Number of questions to generate (5-30)
   * @param {string} difficultyLevel - Difficulty level: easy, medium, hard, or mixed
   * @returns {Promise<Array>} Array of generated questions
   */
  async generateAssessmentQuestions(topic, numberOfQuestions, difficultyLevel) {
    await this.ensureInitialized();

    const sanitizedTopic = topic
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .trim();

    const difficultyInstruction = difficultyLevel === 'mixed'
      ? 'Generate a mix of easy, medium, and hard questions. Distribute them roughly evenly.'
      : `All questions should be "${difficultyLevel}" difficulty level.`;

    const prompt = `You are an expert assessment creator and educator. Generate ${numberOfQuestions} high-quality assessment questions on the following topic.

Topic: "${sanitizedTopic}"

Difficulty: ${difficultyInstruction}

Generate a JSON response with this EXACT structure (no markdown, no code blocks, just pure JSON):
{
  "questions": [
    {
      "type": "multiple_choice_single",
      "text": "Clear, well-written question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswers": [0],
      "difficulty": "easy"
    }
  ]
}

IMPORTANT Guidelines:
1. Generate exactly ${numberOfQuestions} questions
2. Question types MUST be either "multiple_choice_single" (one correct answer) or "multiple_choice_multi" (2+ correct answers)
3. Use mostly "multiple_choice_single" (about 80%), with some "multiple_choice_multi" (about 20%)
4. For "multiple_choice_single": provide exactly 4 options, correctAnswers has exactly 1 index
5. For "multiple_choice_multi": provide 4-5 options, correctAnswers has 2-3 indices
6. correctAnswers is an array of zero-based indices pointing to the correct option(s)
7. Each question must have a "difficulty" field: "easy", "medium", or "hard"
8. Questions should be varied, testing different aspects of the topic
9. Options should be plausible - avoid obviously wrong answers
10. Question text should be clear and unambiguous
11. Return ONLY valid JSON - no explanations, no markdown formatting`;

    try {
      console.log('🤖 Generating assessment questions for:', sanitizedTopic);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = this._extractJSON(text);

      const parsed = JSON.parse(text);

      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error('PARSE_ERROR: No questions generated');
      }

      // Validate and normalize each question
      const validatedQuestions = parsed.questions.map((q, index) => {
        if (!q.text || !q.options || !Array.isArray(q.options) || q.options.length < 2) {
          throw new Error(`PARSE_ERROR: Question ${index + 1} is missing required fields`);
        }

        if (!q.correctAnswers || !Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0) {
          throw new Error(`PARSE_ERROR: Question ${index + 1} has no correct answers marked`);
        }

        const type = q.type === 'multiple_choice_multi' ? 'multiple_choice_multi' : 'multiple_choice_single';
        const validDifficulties = ['easy', 'medium', 'hard'];
        const difficulty = validDifficulties.includes(q.difficulty?.toLowerCase())
          ? q.difficulty.toLowerCase()
          : difficultyLevel === 'mixed' ? 'medium' : difficultyLevel;

        return {
          type,
          text: q.text.trim(),
          options: q.options.map(o => String(o).trim()),
          correctAnswers: q.correctAnswers.filter(i => typeof i === 'number' && i >= 0 && i < q.options.length),
          difficulty
        };
      });

      console.log(`✅ Generated ${validatedQuestions.length} assessment questions for "${sanitizedTopic}"`);
      return validatedQuestions;
    } catch (error) {
      console.error('❌ Assessment question generation error:', error.message);

      if (error.message.includes('SAFETY')) {
        throw new Error('CONTENT_FILTERED: Unable to generate questions for this topic. Please try a different topic.');
      }

      if (error instanceof SyntaxError) {
        throw new Error('PARSE_ERROR: Failed to parse AI response. Please try again.');
      }

      throw new Error(`AI_SERVICE_ERROR: ${error.message}`);
    }
  }

  async generateSubjectiveAssessmentQuestions(topic, numberOfQuestions, difficultyLevel) {
    await this.ensureInitialized();

    const sanitizedTopic = topic
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .trim();

    const difficultyInstruction = difficultyLevel === 'mixed'
      ? 'Generate a mix of easy, medium, and hard questions. Distribute them roughly evenly.'
      : `All questions should be "${difficultyLevel}" difficulty level.`;

    const prompt = `You are an expert assessment creator and educator. Generate ${numberOfQuestions} high-quality subjective assessment questions on the following topic.

Topic: "${sanitizedTopic}"

Difficulty: ${difficultyInstruction}

Generate a JSON response with this EXACT structure (no markdown, no code blocks, just pure JSON):
{
  "questions": [
    {
      "type": "paragraph",
      "text": "Clear, thought-provoking question that requires a detailed answer",
      "difficulty": "easy"
    }
  ]
}

IMPORTANT Guidelines:
1. Generate exactly ${numberOfQuestions} questions
2. Question types MUST be either "short_text" (brief answer) or "paragraph" (detailed answer)
3. Use mostly "paragraph" (about 70%) for deeper understanding, with some "short_text" (about 30%) for quick recall
4. Each question must have a "difficulty" field: "easy", "medium", or "hard"
5. Questions should assess different learning objectives - analysis, synthesis, application
6. Questions should be open-ended and encourage critical thinking
7. Avoid questions with single-word answers
8. Question text should be clear and unambiguous
9. Do NOT include options or correctAnswers fields
10. Return ONLY valid JSON - no explanations, no markdown formatting`;

    try {
      console.log('🤖 Generating subjective assessment questions for:', sanitizedTopic);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = this._extractJSON(text);

      const parsed = JSON.parse(text);

      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
        throw new Error('PARSE_ERROR: No questions generated');
      }

      // Validate and normalize each question
      const validatedQuestions = parsed.questions.map((q, index) => {
        if (!q.text) {
          throw new Error(`PARSE_ERROR: Question ${index + 1} is missing text`);
        }

        const type = q.type === 'short_text' ? 'short_text' : 'paragraph';
        const validDifficulties = ['easy', 'medium', 'hard'];
        const difficulty = validDifficulties.includes(q.difficulty?.toLowerCase())
          ? q.difficulty.toLowerCase()
          : difficultyLevel === 'mixed' ? 'medium' : difficultyLevel;

        return {
          type,
          text: q.text.trim(),
          difficulty
        };
      });

      console.log(`✅ Generated ${validatedQuestions.length} subjective assessment questions for "${sanitizedTopic}"`);
      return validatedQuestions;
    } catch (error) {
      console.error('❌ Subjective question generation error:', error.message);

      if (error.message.includes('SAFETY')) {
        throw new Error('CONTENT_FILTERED: Unable to generate questions for this topic. Please try a different topic.');
      }

      if (error instanceof SyntaxError) {
        throw new Error('PARSE_ERROR: Failed to parse AI response. Please try again.');
      }

      throw new Error(`AI_SERVICE_ERROR: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new GeminiAIService();
