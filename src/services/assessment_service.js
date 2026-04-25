const { promisePool } = require('../config/db');
const { calculateAssessmentScore } = require('./admin/feedback_service');
const geminiAIService = require('./gemini/gemini_ai_service');

const SUBJECTIVE_TYPES = new Set(['short_text', 'paragraph', 'slider']);

/**
 * Submit answers to a feedback_forms (type='assessment') without requiring
 * course enrollment. Used by the assignment-as-assessment flow.
 *
 * Mirrors the scoring/insert behavior of submitLessonAssessment() but
 * without the course/lesson/enrollment checks and without auto-completing
 * a lesson. Returns the inserted response id so the caller can link it
 * from assignment_submissions.assessment_response_id.
 *
 * @param {string} userId
 * @param {number} formId
 * @param {Array<{questionId:number, text?:string, options?:any, rating?:number}>} answers
 * @returns {Promise<{ responseId:number, score:number, maxScore:number, percentage:number, aiScoringResults:any }>}
 */
async function submitAssessmentStandalone(userId, formId, answers) {
  if (!userId) throw new Error('userId required');
  if (!formId) throw new Error('formId required');
  if (!Array.isArray(answers)) throw new Error('answers must be an array');

  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    const [forms] = await connection.query(
      `SELECT id, type, assessment_type, show_correct_answers
         FROM feedback_forms
        WHERE id = ? AND is_deleted = 0`,
      [formId]
    );
    if (forms.length === 0) {
      throw new Error('Assessment not found');
    }
    const form = forms[0];
    if (form.type !== 'assessment') {
      throw new Error('Form is not an assessment');
    }
    const isSubjective = form.assessment_type === 'subjective' || form.assessment_type === 'both';

    const [rawQuestions] = await connection.query(
      `SELECT id, question_order, question_type, question_text, options, correct_answers, score
         FROM feedback_questions
        WHERE form_id = ?
        ORDER BY question_order ASC`,
      [formId]
    );

    const questionsForScoring = rawQuestions.map(q => ({
      ...q,
      options: q.options
        ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options)
        : [],
      correct_answers: q.correct_answers
        ? (typeof q.correct_answers === 'string' ? JSON.parse(q.correct_answers) : q.correct_answers)
        : []
    }));

    let scoreData;
    let aiScoringResults = null;

    if (isSubjective) {
      const questionsForAI = [];
      for (const question of questionsForScoring) {
        if (!SUBJECTIVE_TYPES.has(question.question_type)) continue;
        const userAnswer = answers.find(a => a.questionId === question.id);
        let answerText = '';
        if (question.question_type === 'slider') {
          answerText = userAnswer && userAnswer.rating !== undefined
            ? `Rating: ${userAnswer.rating} out of 10`
            : '(No answer)';
        } else {
          answerText = (userAnswer && userAnswer.text) || '(No answer provided)';
        }
        questionsForAI.push({
          questionId: question.id,
          questionText: question.question_text,
          answerText,
          maxScore: question.score || 1
        });
      }

      try {
        const aiScores = await geminiAIService.scoreSubjectiveAnswers(questionsForAI);
        aiScoringResults = {};
        let totalScore = 0;
        let totalMaxScore = 0;

        for (let i = 0; i < questionsForAI.length; i++) {
          const qId = questionsForAI[i].questionId;
          const aiResult = aiScores[i];
          aiScoringResults[qId] = {
            score: aiResult.score,
            maxScore: aiResult.maxScore,
            feedback: aiResult.feedback
          };
          totalScore += aiResult.score;
          totalMaxScore += aiResult.maxScore;
        }

        // Mix in any objective questions
        for (const question of questionsForScoring) {
          if (SUBJECTIVE_TYPES.has(question.question_type)) continue;
          const userAnswer = answers.find(a => a.questionId === question.id);
          const qMax = question.score || 1;
          totalMaxScore += qMax;
          if (userAnswer && question.correct_answers && question.correct_answers.length > 0) {
            let userIdx = [];
            if (userAnswer.options) {
              const sel = typeof userAnswer.options === 'string'
                ? JSON.parse(userAnswer.options)
                : userAnswer.options;
              if (Array.isArray(sel)) {
                userIdx = sel
                  .map(opt => question.options.findIndex(o => o === opt))
                  .filter(idx => idx !== -1);
              }
            }
            const correctSet = new Set(question.correct_answers);
            const userSet = new Set(userIdx);
            const isCorrect = question.correct_answers.length === userIdx.length
              && question.correct_answers.every(idx => userSet.has(idx))
              && userIdx.every(idx => correctSet.has(idx));
            if (isCorrect) totalScore += qMax;
          }
        }

        scoreData = {
          score: parseFloat(totalScore.toFixed(2)),
          maxScore: totalMaxScore,
          percentage: totalMaxScore > 0 ? Number(((totalScore / totalMaxScore) * 100).toFixed(2)) : 0
        };
      } catch (aiError) {
        console.error('AI scoring failed, falling back to objective scoring only:', aiError && aiError.message);
        scoreData = calculateAssessmentScore(questionsForScoring, answers);
        aiScoringResults = { _error: 'AI scoring unavailable. Subjective answers will be reviewed manually.' };
      }
    } else {
      scoreData = calculateAssessmentScore(questionsForScoring, answers);
    }

    const [scoreCols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'feedback_responses'
          AND COLUMN_NAME IN ('score','max_score','percentage')`
    );
    const hasScoreCols = scoreCols.length >= 3;

    let insertQuery, insertParams;
    if (hasScoreCols) {
      insertQuery = `INSERT INTO feedback_responses (form_id, respondent_name, score, max_score, percentage, submitted_at)
                     VALUES (?, ?, ?, ?, ?, NOW())`;
      insertParams = [formId, userId, scoreData.score, scoreData.maxScore, scoreData.percentage];
    } else {
      insertQuery = `INSERT INTO feedback_responses (form_id, respondent_name, submitted_at)
                     VALUES (?, ?, NOW())`;
      insertParams = [formId, userId];
    }

    const [responseResult] = await connection.query(insertQuery, insertParams);
    const responseId = responseResult.insertId;

    for (const answer of answers) {
      await connection.query(
        `INSERT INTO feedback_answers (response_id, question_id, answer_text, answer_options, answer_rating)
         VALUES (?, ?, ?, ?, ?)`,
        [
          responseId,
          answer.questionId,
          answer.text || null,
          answer.options ? JSON.stringify(answer.options) : null,
          answer.rating !== undefined ? answer.rating : null
        ]
      );
    }

    await connection.commit();

    return {
      responseId,
      score: scoreData.score,
      maxScore: scoreData.maxScore,
      percentage: scoreData.percentage,
      aiScoringResults
    };
  } catch (error) {
    try { await connection.rollback(); } catch (_) { /* ignore */ }
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { submitAssessmentStandalone };
