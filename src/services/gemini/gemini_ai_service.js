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
        console.log(`⚠️ Model ${modelName} failed: ${error.message}`);
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
   * Generate a short-video script (storyboard) from a user command.
   * Used by the Byte Video providers. Returns scenes with an on-screen
   * caption, a narration line, and a stock-media search query.
   * @param {string} command - User's video command / prompt
   * @returns {Promise<Object>} { title, scenes: [{ caption, narration, imageQuery }] }
   */
  async generateVideoScript(command) {
    await this.ensureInitialized();

    const prompt = this._buildVideoScriptPrompt(command);

    try {
      console.log('🎬 Generating byte-video script for:', command.substring(0, 50) + '...');

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      text = this._extractJSON(text);
      const script = JSON.parse(text);
      return this._validateVideoScript(script);
    } catch (error) {
      console.error('❌ Gemini video-script error:', error.message);

      if (error.message.includes('SAFETY')) {
        throw new Error('CONTENT_FILTERED: Unable to generate a video for this request. Please try a different topic.');
      }
      if (error instanceof SyntaxError) {
        throw new Error('PARSE_ERROR: Failed to parse AI video script. Please try again.');
      }
      throw new Error(`AI_SERVICE_ERROR: ${error.message}`);
    }
  }

  /**
   * Build the prompt for generating a short-video script.
   * @param {string} command - User's video command
   * @returns {string} Complete prompt
   */
  _buildVideoScriptPrompt(command) {
    const sanitizedInput = command
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .trim();

    return `You are an expert instructional video scriptwriter. Turn the user's request into a short, engaging explainer video script of 4-6 scenes that reads well as narration and fits roughly 30-60 seconds total.

User's request: "${sanitizedInput}"

Return ONLY valid JSON with this EXACT structure (no markdown, no code blocks):
{
  "title": "A short, descriptive video title (max 80 characters)",
  "scenes": [
    {
      "caption": "A very short on-screen caption / heading for this scene (max 60 characters, no emojis)",
      "narration": "1-2 sentences of spoken narration for this scene (plain text, max 280 characters)",
      "imageQuery": "2-4 plain keywords describing a relevant real photo for this scene (for stock-photo search, e.g. 'green plant leaves sunlight')"
    }
  ]
}

Guidelines:
1. Produce 4-6 scenes with a logical flow (hook -> key points -> takeaway).
2. "caption" is short text shown on screen; "narration" is what the voice says.
3. "imageQuery" must be concrete, visual keywords (objects/scenes a photographer would shoot), NOT abstract phrases — this drives a stock-photo search.
4. Keep language clear and learner-friendly. No markdown, no emojis, no special characters that break captions.
5. Return ONLY the JSON object.

Generate the script now:`;
  }

  /**
   * Validate and normalize a generated video script.
   * @param {Object} script - Raw script from AI
   * @returns {Object} { title, scenes: [{ caption, narration, imageQuery }] }
   */
  _validateVideoScript(script) {
    if (!script || typeof script.title !== 'string' || !script.title.trim()) {
      throw new Error('PARSE_ERROR: Missing or invalid title in AI video script');
    }
    if (!Array.isArray(script.scenes) || script.scenes.length === 0) {
      throw new Error('PARSE_ERROR: Missing or invalid scenes in AI video script');
    }

    const scenes = script.scenes
      .map((s) => ({
        caption: typeof s.caption === 'string' ? s.caption.trim().slice(0, 120) : '',
        narration: typeof s.narration === 'string' ? s.narration.trim().slice(0, 400) : '',
        imageQuery: typeof s.imageQuery === 'string' ? s.imageQuery.trim().slice(0, 100) : '',
      }))
      .filter((s) => s.caption || s.narration);

    if (scenes.length === 0) {
      throw new Error('PARSE_ERROR: AI video script contained no usable scenes');
    }

    return { title: script.title.trim().slice(0, 200), scenes };
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
  /**
   * Score subjective assessment answers using AI
   * @param {Array} questionsAndAnswers - Array of {questionText, answerText, maxScore}
   * @returns {Array} Array of {score, maxScore, feedback}
   */
  async scoreSubjectiveAnswers(questionsAndAnswers) {
    await this.ensureInitialized();

    const questionsForAI = questionsAndAnswers.map((qa, i) => ({
      index: i + 1,
      question: qa.questionText,
      answer: qa.answerText || '(No answer provided)',
      maxScore: qa.maxScore || 1
    }));

    const prompt = `You are an expert assessment evaluator. Score the following subjective answers fairly and consistently.

For each question-answer pair, provide:
- A score from 0 to the maxScore (can use decimals like 0.5)
- Brief feedback explaining the score

SCORING CRITERIA:
- Full marks: Complete, accurate, well-explained answer
- Partial marks: Partially correct or incomplete answer
- Zero marks: No answer, completely wrong, or irrelevant

Questions and Answers to evaluate:
${JSON.stringify(questionsForAI, null, 2)}

Generate a JSON response with this EXACT structure (no markdown, no code blocks, just pure JSON):
{
  "scores": [
    {
      "index": 1,
      "score": 0.8,
      "maxScore": 1,
      "feedback": "Good understanding shown, but missed the key point about..."
    }
  ]
}

IMPORTANT:
1. Evaluate EACH question independently
2. Score must be between 0 and maxScore
3. Be fair but rigorous
4. Feedback should be constructive and specific (1-2 sentences)
5. Return ONLY valid JSON`;

    try {
      console.log('🤖 Scoring subjective assessment answers...');

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = this._extractJSON(text);

      const parsed = JSON.parse(text);

      if (!parsed.scores || !Array.isArray(parsed.scores)) {
        throw new Error('PARSE_ERROR: Invalid scoring response format');
      }

      // Map scores back to the original questions
      const scoredResults = questionsAndAnswers.map((qa, i) => {
        const aiResult = parsed.scores.find(s => s.index === i + 1);
        const score = aiResult ? Math.min(Math.max(0, aiResult.score), qa.maxScore || 1) : 0;

        return {
          score: parseFloat(score.toFixed(2)),
          maxScore: qa.maxScore || 1,
          feedback: aiResult?.feedback || 'Unable to evaluate this answer.'
        };
      });

      console.log(`✅ Scored ${scoredResults.length} subjective answers`);
      return scoredResults;
    } catch (error) {
      console.error('❌ Subjective scoring error:', error.message);

      if (error instanceof SyntaxError) {
        throw new Error('PARSE_ERROR: Failed to parse AI scoring response. Please try again.');
      }

      throw new Error(`AI_SERVICE_ERROR: ${error.message}`);
    }
  }
  /**
   * Generate a custom report configuration from a natural language prompt
   * @param {string} userPrompt - Natural language description of the desired report
   * @param {Object} availableDataSources - Available data sources and their fields
   * @returns {Promise<Object>} Report configuration
   */
  async generateReportConfig(userPrompt, availableDataSources) {
    await this.ensureInitialized();

    const sourceSummary = Object.entries(availableDataSources).map(([key, src]) => ({
      key,
      label: src.label,
      description: src.description,
      fields: src.fields.map(f => ({
        key: f.key,
        label: f.label,
        filterable: f.filterable,
        filterType: f.filterType,
        filterOptions: f.filterOptions,
      })),
    }));

    const prompt = `You are an expert data analyst working with a Learning Management System (LMS). A user wants to build a custom report. Based on their request, generate the optimal report configuration.

Available data sources and their fields:
${JSON.stringify(sourceSummary, null, 2)}

User's request: "${userPrompt}"

Generate a JSON response with this EXACT structure (no markdown, no code blocks, just pure JSON):
{
  "dataSource": "the_best_matching_data_source_key",
  "fields": ["field_key_1", "field_key_2"],
  "filters": [
    {
      "field": "filterable_field_key",
      "operator": "equals|contains|startsWith|greaterThan|lessThan|between",
      "value": "filter_value",
      "valueTo": "optional_for_between"
    }
  ],
  "sortBy": "field_key_to_sort_by_or_empty_string",
  "sortOrder": "asc|desc",
  "chartConfig": {
    "chartType": "bar|horizontal|pie",
    "groupByField": "field_key_to_group_by",
    "aggregateFunction": "count|sum|avg|max|min",
    "aggregateField": "field_key_for_aggregate_or_empty_string"
  },
  "explanation": "Brief explanation of why you chose this configuration and what the report will show"
}

IMPORTANT Rules:
1. "dataSource" MUST be one of the available data source keys
2. "fields" MUST only contain valid field keys from the chosen data source
3. "filters" should only use filterable fields. Use the correct operator based on filterType (select->equals, date->between, text->contains)
4. For "filterOptions" fields, use values from the provided options
5. Include relevant fields that answer the user's question
6. Choose appropriate chart type: bar for comparisons, pie for distributions, horizontal for rankings
7. "aggregateField" is only needed when aggregateFunction is sum/avg/max/min (not count)
8. Return ONLY valid JSON`;

    try {
      console.log('🤖 Generating report config for:', userPrompt.substring(0, 80) + '...');

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = this._extractJSON(text);

      const config = JSON.parse(text);

      // Validate the data source exists
      if (!availableDataSources[config.dataSource]) {
        // Fallback to first available source
        config.dataSource = Object.keys(availableDataSources)[0];
        config.fields = availableDataSources[config.dataSource].fields.slice(0, 5).map(f => f.key);
      }

      // Validate fields exist in chosen source
      const validFieldKeys = availableDataSources[config.dataSource].fields.map(f => f.key);
      config.fields = (config.fields || []).filter(f => validFieldKeys.includes(f));
      if (config.fields.length === 0) {
        config.fields = validFieldKeys.slice(0, 5);
      }

      // Validate filters
      const filterableFieldKeys = availableDataSources[config.dataSource].fields
        .filter(f => f.filterable)
        .map(f => f.key);
      config.filters = (config.filters || []).filter(f => filterableFieldKeys.includes(f.field));

      // Validate chart config
      if (config.chartConfig) {
        if (!validFieldKeys.includes(config.chartConfig.groupByField)) {
          config.chartConfig.groupByField = validFieldKeys[0];
        }
        if (!['bar', 'horizontal', 'pie'].includes(config.chartConfig.chartType)) {
          config.chartConfig.chartType = 'bar';
        }
        if (!['count', 'sum', 'avg', 'max', 'min'].includes(config.chartConfig.aggregateFunction)) {
          config.chartConfig.aggregateFunction = 'count';
        }
      }

      return config;
    } catch (error) {
      console.error('❌ Report config generation error:', error.message);

      if (error.message.includes('SAFETY')) {
        throw new Error('CONTENT_FILTERED: Unable to process this request. Please try a different description.');
      }

      if (error instanceof SyntaxError) {
        throw new Error('PARSE_ERROR: Failed to parse AI response. Please try again.');
      }

      throw new Error(`AI_SERVICE_ERROR: ${error.message}`);
    }
  }

  /**
   * Parse a natural language schedule command into a structured schedule configuration
   * @param {string} command - Natural language scheduling command
   * @returns {Promise<Object>} Parsed schedule configuration
   */
  async parseScheduleCommand(command) {
    await this.ensureInitialized();

    const sanitizedCommand = command
      .replace(/<[^>]*>/g, '')
      .replace(/[<>]/g, '')
      .trim();

    const today = new Date().toISOString().split('T')[0];

    const prompt = `You are a smart scheduling assistant for an LMS report system. Parse the user's natural language command into a structured schedule configuration.

Today's date is: ${today}

User's command: "${sanitizedCommand}"

You must return a JSON object with this EXACT structure (no markdown, no code blocks, just pure JSON):
{
  "scheduleName": "A short descriptive name for this schedule (e.g., 'Weekly Monday Report')",
  "frequency": "once | daily | weekdays | weekly | biweekly | monthly | custom",
  "daysOfWeek": [0,1,2,3,4,5,6],
  "daysOfMonth": [1,2,...,31],
  "specificDates": ["YYYY-MM-DD", "YYYY-MM-DD"],
  "repeatEndDate": "YYYY-MM-DD or null",
  "timeOfDay": "HH:mm (24-hour format)",
  "timezone": "timezone string",
  "recipients": ["email@example.com"],
  "explanation": "Brief human-readable explanation of what was understood"
}

RULES:
1. "frequency" must be EXACTLY one of: once, daily, weekdays, weekly, biweekly, monthly, custom
2. "daysOfWeek": only include for weekly/biweekly. 0=Sunday, 1=Monday, ..., 6=Saturday. Omit or set to [] for other frequencies.
3. "daysOfMonth": only include for monthly. Values 1-31. Omit or set to [] for other frequencies.
4. "specificDates": only include for once/custom. Must be YYYY-MM-DD format. For "once", include all specific dates mentioned. For "custom", include all dates.
5. "repeatEndDate": set if user mentions an end date, otherwise null
6. "timeOfDay": default to "09:00" if not specified. Use 24-hour format.
7. "timezone": default to "Asia/Kolkata" if not specified. Use IANA timezone names.
8. "recipients": extract email addresses if mentioned, otherwise return empty array []
9. "explanation": explain in simple English what the schedule will do
10. If user says "every Monday and Wednesday" → frequency: "weekly", daysOfWeek: [1, 3]
11. If user says "on the 1st and 15th" → frequency: "monthly", daysOfMonth: [1, 15]
12. If user says "next Friday" or specific dates → frequency: "once", specificDates: ["YYYY-MM-DD"]
13. If user says "weekdays" or "Monday to Friday" → frequency: "weekdays"
14. If user says "every other week" → frequency: "biweekly"
15. Convert relative dates (e.g., "next Monday", "tomorrow") to absolute YYYY-MM-DD dates based on today's date
16. Return ONLY valid JSON - no explanations, no markdown formatting`;

    try {
      console.log('🤖 Parsing schedule command:', sanitizedCommand.substring(0, 80));

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = this._extractJSON(text);

      const parsed = JSON.parse(text);

      // Validate and normalize
      const validFrequencies = ['once', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly', 'custom'];
      if (!validFrequencies.includes(parsed.frequency)) {
        parsed.frequency = 'daily';
      }

      // Normalize daysOfWeek
      if (parsed.daysOfWeek && Array.isArray(parsed.daysOfWeek)) {
        parsed.daysOfWeek = parsed.daysOfWeek.filter(d => typeof d === 'number' && d >= 0 && d <= 6);
      } else {
        parsed.daysOfWeek = [];
      }

      // Normalize daysOfMonth
      if (parsed.daysOfMonth && Array.isArray(parsed.daysOfMonth)) {
        parsed.daysOfMonth = parsed.daysOfMonth.filter(d => typeof d === 'number' && d >= 1 && d <= 31);
      } else {
        parsed.daysOfMonth = [];
      }

      // Normalize specificDates
      if (parsed.specificDates && Array.isArray(parsed.specificDates)) {
        parsed.specificDates = parsed.specificDates.filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d));
      } else {
        parsed.specificDates = [];
      }

      // Normalize timeOfDay
      if (!parsed.timeOfDay || !/^\d{2}:\d{2}$/.test(parsed.timeOfDay)) {
        parsed.timeOfDay = '09:00';
      }

      // Normalize timezone
      if (!parsed.timezone) {
        parsed.timezone = 'Asia/Kolkata';
      }

      // Normalize recipients
      if (!Array.isArray(parsed.recipients)) {
        parsed.recipients = [];
      }

      // Normalize repeatEndDate
      if (parsed.repeatEndDate && !/^\d{4}-\d{2}-\d{2}$/.test(parsed.repeatEndDate)) {
        parsed.repeatEndDate = null;
      }

      console.log(`✅ Parsed schedule command: ${parsed.frequency}, time: ${parsed.timeOfDay}`);

      return {
        scheduleName: parsed.scheduleName || null,
        frequency: parsed.frequency,
        daysOfWeek: parsed.daysOfWeek,
        daysOfMonth: parsed.daysOfMonth,
        specificDates: parsed.specificDates,
        repeatEndDate: parsed.repeatEndDate || null,
        timeOfDay: parsed.timeOfDay,
        timezone: parsed.timezone,
        recipients: parsed.recipients,
        explanation: parsed.explanation || 'Schedule parsed successfully'
      };
    } catch (error) {
      console.error('❌ Schedule command parsing error:', error.message);

      if (error.message.includes('SAFETY')) {
        throw new Error('CONTENT_FILTERED: Unable to parse this command. Please try rephrasing.');
      }

      if (error instanceof SyntaxError) {
        throw new Error('PARSE_ERROR: Failed to understand the command. Please try again with clearer instructions.');
      }

      throw new Error(`AI_SERVICE_ERROR: ${error.message}`);
    }
  }

  /**
   * Generate insights and analysis from report data
   * @param {Object} params - Report context for analysis
   * @param {string} params.dataSourceLabel - Name of the data source
   * @param {Array} params.data - Array of data rows (limited sample)
   * @param {Array} params.fields - Array of {key, label} field descriptors
   * @param {number} params.totalRecords - Total record count
   * @param {Object} params.chartSummary - Optional aggregate summary
   * @returns {Promise<Object>} Generated insights
   */
  async generateReportInsights(params) {
    await this.ensureInitialized();

    const { dataSourceLabel, data, fields, totalRecords, chartSummary } = params;

    // Limit data sample to avoid token overflow
    const sampleData = (data || []).slice(0, 30);

    const prompt = `You are an expert data analyst reviewing an LMS (Learning Management System) report. Analyze the following data and provide clear, actionable insights.

Data Source: ${dataSourceLabel}
Total Records: ${totalRecords}
Fields: ${fields.map(f => f.label).join(', ')}
${chartSummary ? `\nAggregate Summary: ${JSON.stringify(chartSummary)}` : ''}

Sample Data (${sampleData.length} of ${totalRecords} records):
${JSON.stringify(sampleData, null, 1)}

Generate a JSON response with this EXACT structure (no markdown, no code blocks, just pure JSON):
{
  "summary": "A 2-3 sentence executive summary of what this data shows",
  "keyFindings": [
    "Finding 1 - a specific, data-backed observation",
    "Finding 2 - another specific insight",
    "Finding 3 - a notable pattern or trend"
  ],
  "recommendations": [
    "Actionable recommendation 1",
    "Actionable recommendation 2",
    "Actionable recommendation 3"
  ],
  "highlights": {
    "positive": "One positive highlight from the data",
    "concern": "One area of concern or improvement opportunity",
    "trend": "A notable trend or pattern"
  }
}

IMPORTANT:
1. Be specific - reference actual values and field names from the data
2. Keep insights concise and actionable
3. Focus on patterns relevant to learning management
4. Return ONLY valid JSON`;

    try {
      console.log('🤖 Generating report insights for:', dataSourceLabel);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();
      text = this._extractJSON(text);

      const insights = JSON.parse(text);

      // Validate structure
      return {
        summary: insights.summary || 'Analysis complete.',
        keyFindings: Array.isArray(insights.keyFindings) ? insights.keyFindings.slice(0, 5) : [],
        recommendations: Array.isArray(insights.recommendations) ? insights.recommendations.slice(0, 5) : [],
        highlights: {
          positive: insights.highlights?.positive || '',
          concern: insights.highlights?.concern || '',
          trend: insights.highlights?.trend || '',
        },
      };
    } catch (error) {
      console.error('❌ Report insights generation error:', error.message);

      if (error.message.includes('SAFETY')) {
        throw new Error('CONTENT_FILTERED: Unable to analyze this data. Please try again.');
      }

      if (error instanceof SyntaxError) {
        throw new Error('PARSE_ERROR: Failed to parse AI analysis. Please try again.');
      }

      throw new Error(`AI_SERVICE_ERROR: ${error.message}`);
    }
  }

  /**
   * Generate a chatbot response using multi-turn conversation format
   * @param {string} systemPrompt - System instructions with knowledge context
   * @param {Array<{role: string, content: string}>} conversationHistory - Previous messages
   * @returns {Promise<string>} AI response text
   */
  async generateChatResponse(systemPrompt, conversationHistory) {
    await this.ensureInitialized();

    try {
      // Build multi-turn contents array
      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'Understood. I will act as the Mkraft LMS support assistant following these instructions.' }] },
        ...conversationHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      ];

      const result = await this.model.generateContent({ contents });
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Chatbot AI Error:', error.message);

      if (error.message.includes('SAFETY')) {
        return "I'm sorry, I couldn't process that request. Could you please rephrase your question?";
      }

      throw new Error(`AI_SERVICE_ERROR: ${error.message}`);
    }
  }
}

// Export singleton instance
module.exports = new GeminiAIService();
