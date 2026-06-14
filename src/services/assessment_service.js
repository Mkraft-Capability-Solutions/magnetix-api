const { promisePool } = require('../config/db');
const { calculateAssessmentScore } = require('./admin/feedback_service');
const geminiAIService = require('./gemini/gemini_ai_service');

const SUBJECTIVE_TYPES = new Set(['short_text', 'paragraph', 'slider']);

/**
 * Submit answers to a feedback_forms (type='assessment') without requiring
 * course enrollment. Used by the assignment-as-assessment flow.
 *
 * Behavior:
 *   - Auto-grades objective questions via calculateAssessmentScore.
 *   - For subjective/combined assessments, calls Gemini for per-question
 *     subjective scoring + reasoning, then PERSISTS the result onto each
 *     feedback_answers row (ai_score / ai_feedback / max_score).
 *   - Reads `feedback_forms.show_report`; when 0 the caller may strip score
 *     details from the learner-facing return value (we surface the flag here
 *     but keep the totals so admin/email flows still have access).
 *
 * @returns {Promise<{
 *   responseId:number,
 *   score:number, maxScore:number, percentage:number,
 *   aiScoringResults:object|null,
 *   showReport:boolean
 * }>}
 */
async function submitAssessmentStandalone(userId, formId, answers) {
  if (!userId) throw new Error('userId required');
  if (!formId) throw new Error('formId required');
  if (!Array.isArray(answers)) throw new Error('answers must be an array');

  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    const [forms] = await connection.query(
      `SELECT id, type, assessment_type, show_correct_answers, show_report
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
    const showReport = form.show_report !== 0; // default true if column missing
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

    // Build a per-question score lookup so we can persist scoring data
    // alongside each feedback_answers row. Keys: questionId.
    // Values: { score, maxScore, aiFeedback }.
    const perQuestionScore = new Map();
    for (const q of questionsForScoring) {
      perQuestionScore.set(q.id, { score: 0, maxScore: q.score || 1, aiFeedback: null });
    }

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
          const aiResult = aiScores[i] || { score: 0, maxScore: questionsForAI[i].maxScore, feedback: null };
          aiScoringResults[qId] = {
            score: aiResult.score,
            maxScore: aiResult.maxScore,
            feedback: aiResult.feedback
          };
          perQuestionScore.set(qId, {
            score: aiResult.score,
            maxScore: aiResult.maxScore,
            aiFeedback: aiResult.feedback || null
          });
          totalScore += aiResult.score;
          totalMaxScore += aiResult.maxScore;
        }

        // Mix in any objective questions
        for (const question of questionsForScoring) {
          if (SUBJECTIVE_TYPES.has(question.question_type)) continue;
          const userAnswer = answers.find(a => a.questionId === question.id);
          const qMax = question.score || 1;
          totalMaxScore += qMax;
          let isCorrect = false;
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
            isCorrect = question.correct_answers.length === userIdx.length
              && question.correct_answers.every(idx => userSet.has(idx))
              && userIdx.every(idx => correctSet.has(idx));
            if (isCorrect) totalScore += qMax;
          }
          perQuestionScore.set(question.id, {
            score: isCorrect ? qMax : 0,
            maxScore: qMax,
            aiFeedback: null
          });
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
        // Per-question scores: zero out subjective, record correctness for objective
        for (const question of questionsForScoring) {
          if (SUBJECTIVE_TYPES.has(question.question_type)) {
            perQuestionScore.set(question.id, { score: 0, maxScore: question.score || 1, aiFeedback: '(Awaiting manual review — AI scoring unavailable)' });
          }
        }
      }
    } else {
      scoreData = calculateAssessmentScore(questionsForScoring, answers);
      // Pure-objective assessment: derive per-question correctness from
      // the same logic calculateAssessmentScore uses, so feedback_answers
      // gets accurate per-row scores too.
      for (const question of questionsForScoring) {
        const userAnswer = answers.find(a => a.questionId === question.id);
        const qMax = question.score || 1;
        let isCorrect = false;
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
          isCorrect = question.correct_answers.length === userIdx.length
            && question.correct_answers.every(idx => userSet.has(idx))
            && userIdx.every(idx => correctSet.has(idx));
        }
        perQuestionScore.set(question.id, {
          score: isCorrect ? qMax : 0,
          maxScore: qMax,
          aiFeedback: null
        });
      }
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

    // Detect whether feedback_answers has the per-row scoring columns
    // (ai_score / ai_feedback / max_score). On older schemas they may
    // be missing — fall back to the legacy 5-column INSERT.
    const [answerScoreCols] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'feedback_answers'
          AND COLUMN_NAME IN ('ai_score','ai_feedback','max_score')`
    );
    const hasAnswerScoreCols = answerScoreCols.length >= 3;

    for (const answer of answers) {
      const ps = perQuestionScore.get(answer.questionId) || { score: null, maxScore: null, aiFeedback: null };
      if (hasAnswerScoreCols) {
        await connection.query(
          `INSERT INTO feedback_answers
             (response_id, question_id, answer_text, answer_options, answer_rating,
              ai_score, ai_feedback, max_score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            responseId,
            answer.questionId,
            answer.text || null,
            answer.options ? JSON.stringify(answer.options) : null,
            answer.rating !== undefined ? answer.rating : null,
            ps.score != null ? ps.score : null,
            ps.aiFeedback,
            ps.maxScore != null ? ps.maxScore : null
          ]
        );
      } else {
        await connection.query(
          `INSERT INTO feedback_answers
             (response_id, question_id, answer_text, answer_options, answer_rating)
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
    }

    await connection.commit();

    return {
      responseId,
      score: scoreData.score,
      maxScore: scoreData.maxScore,
      percentage: scoreData.percentage,
      aiScoringResults,
      showReport
    };
  } catch (error) {
    try { await connection.rollback(); } catch (_) { /* ignore */ }
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = { submitAssessmentStandalone };
