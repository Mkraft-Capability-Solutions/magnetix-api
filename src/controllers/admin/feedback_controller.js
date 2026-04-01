const feedbackService = require('../../services/admin/feedback_service');
const geminiAIService = require('../../services/gemini/gemini_ai_service');

// ===== ADMIN ENDPOINTS =====

/**
 * Get all feedback forms
 * GET /api/admin/feedback/forms
 */
exports.getAllForms = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const forms = await feedbackService.getAllForms({ status, type, search });

    res.json({
      success: true,
      data: forms
    });
  } catch (error) {
    console.error('Feedback Controller - getAllForms error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch forms',
      error: error.message
    });
  }
};

/**
 * Get form by ID
 * GET /api/admin/feedback/forms/:id
 */
exports.getFormById = async (req, res) => {
  try {
    const { id } = req.params;
    const form = await feedbackService.getFormById(id);

    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    res.json({
      success: true,
      data: form
    });
  } catch (error) {
    console.error('Feedback Controller - getFormById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch form',
      error: error.message
    });
  }
};

/**
 * Create new form
 * POST /api/admin/feedback/forms
 */
exports.createForm = async (req, res) => {
  try {
    const result = await feedbackService.createForm(req.body, req.user.uuid);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Form created successfully'
    });
  } catch (error) {
    console.error('Feedback Controller - createForm error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create form',
      error: error.message
    });
  }
};

/**
 * Update form
 * PUT /api/admin/feedback/forms/:id
 */
exports.updateForm = async (req, res) => {
  try {
    const { id } = req.params;
    await feedbackService.updateForm(id, req.body);

    res.json({
      success: true,
      message: 'Form updated successfully'
    });
  } catch (error) {
    console.error('Feedback Controller - updateForm error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update form',
      error: error.message
    });
  }
};

/**
 * Delete form
 * DELETE /api/admin/feedback/forms/:id
 */
exports.deleteForm = async (req, res) => {
  try {
    const { id } = req.params;
    await feedbackService.deleteForm(id);

    res.json({
      success: true,
      message: 'Form deleted successfully'
    });
  } catch (error) {
    console.error('Feedback Controller - deleteForm error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete form',
      error: error.message
    });
  }
};

/**
 * Get form analytics
 * GET /api/admin/feedback/forms/:id/analytics
 */
exports.getFormAnalytics = async (req, res) => {
  try {
    const { id } = req.params;
    const analytics = await feedbackService.getFormAnalytics(id);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Feedback Controller - getFormAnalytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics',
      error: error.message
    });
  }
};

/**
 * Get form responses for export
 * GET /api/admin/feedback/forms/:id/responses
 */
exports.getFormResponses = async (req, res) => {
  try {
    const { id } = req.params;
    const responses = await feedbackService.getFormResponses(id);

    res.json({
      success: true,
      data: responses
    });
  } catch (error) {
    console.error('Feedback Controller - getFormResponses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch responses',
      error: error.message
    });
  }
};

/**
 * Get paginated form responses
 * GET /api/admin/feedback/forms/:id/responses/paginated
 */
exports.getFormResponsesPaginated = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, search = '' } = req.query;

    const result = await feedbackService.getFormResponsesPaginated(
      id,
      parseInt(page),
      parseInt(limit),
      search
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Feedback Controller - getFormResponsesPaginated error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch responses',
      error: error.message
    });
  }
};

/**
 * Get detailed response by ID (with scoring data for subjective)
 * GET /api/admin/feedback/responses/:id
 */
exports.getResponseById = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await feedbackService.getResponseByIdWithScoring(id);

    if (!response) {
      return res.status(404).json({
        success: false,
        message: 'Response not found'
      });
    }

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Feedback Controller - getResponseById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch response details',
      error: error.message
    });
  }
};

/**
 * Share response report via email with PDF attachment
 * POST /api/admin/feedback/responses/:id/share
 */
exports.shareResponseEmail = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipients, subject, message } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one recipient email is required' });
    }

    const response = await feedbackService.getResponseByIdWithScoring(id);
    if (!response) {
      return res.status(404).json({ success: false, message: 'Response not found' });
    }

    const emailHelper = require('../../utils/email_helper');
    const PDFDocument = require('pdfkit');
    const name = response.respondentName || 'Anonymous';
    const score = response.score != null ? `${response.score}/${response.maxScore} (${response.percentage}%)` : 'Not scored';

    // Generate PDF report
    const pdfBuffer = await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).fillColor('#1f2937').text('Assessment Report', { align: 'center' });
      doc.moveDown(0.3);
      doc.fontSize(14).fillColor('#6b7280').text(response.formName, { align: 'center' });
      doc.moveDown(1);

      // Respondent info box
      doc.fontSize(11).fillColor('#374151');
      doc.text(`Respondent: ${name}`);
      if (response.respondentEmail) doc.text(`Email: ${response.respondentEmail}`);
      doc.text(`Score: ${score}`);
      doc.text(`Submitted: ${new Date(response.submittedAt).toLocaleString()}`);
      if (response.assessmentType) doc.text(`Assessment Type: ${response.assessmentType}`);
      doc.moveDown(1);

      // Separator
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
      doc.moveDown(1);

      // Questions & Answers
      doc.fontSize(14).fillColor('#1f2937').text('Questions & Answers');
      doc.moveDown(0.5);

      const subjectiveTypes = ['short_text', 'paragraph', 'slider'];

      response.questionsAndAnswers.forEach((qa, idx) => {
        // Check if we need a new page
        if (doc.y > 680) doc.addPage();

        doc.fontSize(11).fillColor('#1f2937').text(`Q${qa.questionOrder || idx + 1}. ${qa.questionText}`, { continued: false });
        doc.fontSize(9).fillColor('#6b7280').text(`Type: ${qa.questionType.replace(/_/g, ' ')}`);

        // Answer
        if (qa.questionType === 'multiple_choice_single' || qa.questionType === 'multiple_choice_multi') {
          if (qa.answerOptions && qa.answerOptions.length > 0) {
            doc.fontSize(10).fillColor('#374151').text(`Answer: ${qa.answerOptions.join(', ')}`);
          } else {
            doc.fontSize(10).fillColor('#9ca3af').text('No answer provided');
          }
          if (qa.isCorrect !== undefined) {
            doc.fontSize(10).fillColor(qa.isCorrect ? '#059669' : '#dc2626').text(qa.isCorrect ? 'Correct' : 'Incorrect');
          }
        } else if (qa.questionType === 'slider') {
          doc.fontSize(10).fillColor('#374151').text(`Answer: ${qa.answerText || qa.answerRating || 'No answer'}`);
        } else if (qa.questionType === 'star_rating') {
          doc.fontSize(10).fillColor('#374151').text(`Rating: ${qa.answerRating || 'No rating'}/5`);
        } else {
          doc.fontSize(10).fillColor('#374151').text(`Answer: ${qa.answerText || 'No answer provided'}`);
        }

        // AI/Manual scoring for subjective questions
        if (subjectiveTypes.includes(qa.questionType)) {
          if (qa.aiScore != null) {
            doc.fontSize(9).fillColor('#7c3aed').text(`AI Score: ${qa.aiScore}/${qa.questionMaxScore || 1}`);
          }
          if (qa.manualScore != null) {
            doc.fontSize(9).fillColor('#0369a1').text(`Manual Score: ${qa.manualScore}/${qa.questionMaxScore || 1}`);
          }
          if (qa.aiFeedback) {
            doc.fontSize(9).fillColor('#6b7280').text(`AI Feedback: ${qa.aiFeedback}`);
          }
        }

        doc.moveDown(0.8);
      });

      // Footer
      doc.moveDown(1);
      doc.fontSize(9).fillColor('#9ca3af').text('Generated by Magnetix Assessment Platform', { align: 'center' });

      doc.end();
    });

    // Email body
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1f2937;">Assessment Report: ${response.formName}</h2>
        <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>Respondent:</strong> ${name}</p>
          ${response.respondentEmail ? `<p><strong>Email:</strong> ${response.respondentEmail}</p>` : ''}
          <p><strong>Score:</strong> ${score}</p>
          <p><strong>Submitted:</strong> ${new Date(response.submittedAt).toLocaleString()}</p>
        </div>
        ${message ? `<div style="margin: 16px 0; padding: 12px; background: #eff6ff; border-radius: 6px;"><p>${message}</p></div>` : ''}
        <p style="margin-top: 16px;">Please find the detailed assessment report attached as a PDF.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #6b7280; font-size: 13px;">This report was shared from the Magnetix Assessment Platform.</p>
      </div>
    `;

    const fileName = `${response.formName}_${name}_Report.pdf`.replace(/\s+/g, '_');

    await emailHelper.sendEmail({
      to: recipients.join(', '),
      subject: subject || `Assessment Report: ${response.formName} - ${name}`,
      html: emailBody,
      attachments: [{
        filename: fileName,
        content: pdfBuffer,
        contentType: 'application/pdf',
      }],
    });

    res.json({ success: true, message: 'Report shared successfully with PDF attachment' });
  } catch (error) {
    console.error('Feedback Controller - shareResponseEmail error:', error);
    res.status(500).json({ success: false, message: 'Failed to send email', error: error.message });
  }
};

/**
 * AI score a subjective assessment response
 * POST /api/admin/feedback/responses/:id/ai-score
 */
exports.aiScoreResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await feedbackService.aiScoreResponse(id);

    res.json({
      success: true,
      data: result,
      message: 'AI scoring completed successfully'
    });
  } catch (error) {
    console.error('Feedback Controller - aiScoreResponse error:', error);

    if (error.message.includes('PARSE_ERROR') || error.message.includes('AI_SERVICE_ERROR')) {
      return res.status(503).json({
        success: false,
        message: 'AI service error. Please try again.',
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to score response',
      error: error.message
    });
  }
};

/**
 * Update manual scores for a subjective response
 * PUT /api/admin/feedback/responses/:id/score
 */
exports.updateManualScores = async (req, res) => {
  try {
    const { id } = req.params;
    const { scores } = req.body;

    if (!scores || !Array.isArray(scores) || scores.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Scores array is required'
      });
    }

    const result = await feedbackService.updateManualScores(id, scores);

    res.json({
      success: true,
      data: result,
      message: 'Scores updated successfully'
    });
  } catch (error) {
    console.error('Feedback Controller - updateManualScores error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scores',
      error: error.message
    });
  }
};

/**
 * Generate assessment questions using AI
 * POST /api/admin/feedback/forms/ai-generate-questions
 */
exports.generateAssessmentQuestions = async (req, res) => {
  try {
    const { topic, numberOfQuestions, difficultyLevel, assessmentType } = req.body;

    // Validate required fields
    if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: { message: 'Topic is required and must be at least 3 characters', code: 'INVALID_INPUT' }
      });
    }

    if (topic.trim().length > 500) {
      return res.status(400).json({
        success: false,
        error: { message: 'Topic must be less than 500 characters', code: 'INVALID_INPUT' }
      });
    }

    const count = parseInt(numberOfQuestions) || 10;
    if (count < 5 || count > 30) {
      return res.status(400).json({
        success: false,
        error: { message: 'Number of questions must be between 5 and 30', code: 'INVALID_INPUT' }
      });
    }

    const validDifficulties = ['easy', 'medium', 'hard', 'mixed'];
    const difficulty = validDifficulties.includes(difficultyLevel) ? difficultyLevel : 'medium';

    // Choose AI generation method based on assessment type
    let questions;
    if (assessmentType === 'both') {
      // Generate mixed questions based on ratio
      const ratio = Math.max(10, Math.min(90, parseInt(req.body.objectiveRatio) || 50));
      const objectiveCount = Math.max(1, Math.round(count * ratio / 100));
      const subjectiveCount = Math.max(1, count - objectiveCount);

      const [objectiveQuestions, subjectiveQuestions] = await Promise.all([
        geminiAIService.generateAssessmentQuestions(topic.trim(), objectiveCount, difficulty),
        geminiAIService.generateSubjectiveAssessmentQuestions(topic.trim(), subjectiveCount, difficulty),
      ]);

      questions = [...objectiveQuestions, ...subjectiveQuestions];
    } else if (assessmentType === 'subjective') {
      questions = await geminiAIService.generateSubjectiveAssessmentQuestions(topic.trim(), count, difficulty);
    } else {
      questions = await geminiAIService.generateAssessmentQuestions(topic.trim(), count, difficulty);
    }

    res.json({
      success: true,
      data: { questions },
      message: `Generated ${questions.length} questions successfully`
    });
  } catch (error) {
    console.error('Feedback Controller - generateAssessmentQuestions error:', error);

    if (error.message.startsWith('CONTENT_FILTERED:')) {
      return res.status(400).json({
        success: false,
        error: { message: error.message.replace('CONTENT_FILTERED: ', ''), code: 'CONTENT_FILTERED' }
      });
    }

    if (error.message.startsWith('PARSE_ERROR:')) {
      return res.status(500).json({
        success: false,
        error: { message: error.message.replace('PARSE_ERROR: ', ''), code: 'PARSE_ERROR' }
      });
    }

    if (error.message.startsWith('AI_SERVICE_ERROR:')) {
      return res.status(503).json({
        success: false,
        error: { message: 'AI service is temporarily unavailable. Please try again.', code: 'AI_SERVICE_ERROR' }
      });
    }

    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate questions. Please try again.', code: 'GENERATION_ERROR' }
    });
  }
};

// ===== PUBLIC ENDPOINTS (no auth) =====

/**
 * Get public form by slug
 * GET /api/public/feedback/:slug
 */
exports.getPublicForm = async (req, res) => {
  try {
    const { slug } = req.params;
    const browserFingerprint = req.headers['x-browser-fingerprint'] || null;

    const result = await feedbackService.getPublicFormBySlug(slug, browserFingerprint);

    if (result.error) {
      const statusCode = result.error === 'FORM_NOT_FOUND' ? 404 : 400;
      return res.status(statusCode).json({
        success: false,
        error: result.error,
        message: result.message
      });
    }

    res.json({
      success: true,
      data: result.form
    });
  } catch (error) {
    console.error('Feedback Controller - getPublicForm error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch form',
      error: error.message
    });
  }
};

/**
 * Submit public form response
 * POST /api/public/feedback/:slug/submit
 */
exports.submitPublicResponse = async (req, res) => {
  try {
    const { slug } = req.params;
    const browserFingerprint = req.headers['x-browser-fingerprint'] || req.body.browserFingerprint;

    const result = await feedbackService.submitResponse(slug, {
      ...req.body,
      browserFingerprint,
      ipAddress: req.ip || req.connection?.remoteAddress
    });

    if (result.error) {
      return res.status(400).json({
        success: false,
        error: result.error,
        message: result.message
      });
    }

    // Build response with assessment results if available
    const response = {
      success: true,
      message: 'Response submitted successfully',
      data: { responseId: result.responseId }
    };

    // Include assessment results if present
    if (result.score !== undefined) {
      response.score = result.score;
      response.maxScore = result.maxScore;
      response.percentage = result.percentage;
      response.showCorrectAnswers = result.showCorrectAnswers;
      response.showReport = result.showReport;
      response.results = result.results;
      response.respondentName = result.respondentName;
      response.respondentEmail = result.respondentEmail;
    }

    res.json(response);
  } catch (error) {
    console.error('Feedback Controller - submitPublicResponse error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit response',
      error: error.message
    });
  }
};

/**
 * Get all submissions across all forms with filters
 * GET /api/admin/feedback/submissions
 * Query params: page, limit, type, assessmentType, search
 */
exports.getAllSubmissions = async (req, res) => {
  try {
    const { page = 1, limit = 20, type, assessmentType, search } = req.query;

    const result = await feedbackService.getAllSubmissions(
      parseInt(page),
      parseInt(limit),
      type,
      assessmentType,
      search
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Feedback Controller - getAllSubmissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch submissions',
      error: error.message
    });
  }
};
