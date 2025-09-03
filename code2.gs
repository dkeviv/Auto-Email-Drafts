// ==============================================================
// GMAIL AUTO-DRAFT REPLY ADDON (AI-POWERED with openrouter API)
// ===============================================================

// 🛑 ACTION REQUIRED: Paste your OpenRouter API key here.
// Get your key from: https://openrouter.ai/keys
const OPENROUTER_API_KEY = 'PASTE_YOUR_API_KEY_HERE';

/**
 * Main function that processes emails and creates automated draft replies.
 */
function createAutomatedDrafts() {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'PASTE_YOUR_API_KEY_HERE') {
    console.error('ERROR: OpenRouter API key is not set. Please add your key to the script.');
    return;
  }
  try {
    const threads = GmailApp.search('is:unread in:inbox', 0, 10);
    if (threads.length === 0) {
      console.log('No unread emails found');
      return;
    }

    threads.forEach(thread => {
      const latestMessage = thread.getMessages()[thread.getMessageCount() - 1];

      if (latestMessage.getFrom().includes(Session.getActiveUser().getEmail()) || hasDraftReply(thread) || isMeetingInvite(latestMessage)) {
        if (isMeetingInvite(latestMessage)) console.log('Skipping meeting invitation: ' + thread.getFirstMessageSubject());
        return;
      }
      
      createDraftReply(thread, latestMessage);
    });
  } catch (error) {
    console.error('Error in createAutomatedDrafts:', error.toString());
  }
}

/**
 * Creates a polished draft reply using an LLM.
 */
function createDraftReply(thread, message) {
  try {
    const analysis = analyzeEmail(message);
    const draftContent = generateDraftWithLLM(analysis);

    if (draftContent) {
      thread.createDraftReply(draftContent);
      console.log('AI-generated draft created for: ' + thread.getFirstMessageSubject());
    } else {
      console.error('Failed to generate draft content for: ' + thread.getFirstMessageSubject());
    }
  } catch (error) {
    console.error('Error creating draft reply:', error.toString());
  }
}

/**
 * Generates draft content by calling the OpenRouter API.
 */
function generateDraftWithLLM(analysis) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  
  const prompt = `You are a world-class executive assistant. Your task is to draft a professional and helpful email reply based on the provided context.
  - Your tone should be polite, proactive, and concise.
  - Acknowledge the key requests and action items clearly.
  - If the urgency is high, reflect that in your response.
  - Conclude the email professionally.
  - Do NOT use placeholders like "[Your Name]"; the email is ready to send.

  **Email Context:**
  - **From:** ${analysis.senderEmail}
  - **Subject:** "${analysis.subject.replace(/^re:\s*/i, '')}"
  - **Urgency:** ${analysis.urgency}
  - **Key Requests:** ${analysis.asks.join(', ') || 'None identified'}
  - **Action Items:** ${analysis.actionItems.join(', ') || 'None identified'}
  - **Original Body (for context):**\n${analysis.body.substring(0, 500)}...

  Please now compose the email draft.`;

  const payload = {
    model: 'google/gemini-pro', // Using Google's Gemini Pro model
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://script.google.com',
      'X-Title': 'Gmail Auto-Draft Addon'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode === 200) {
      const jsonResponse = JSON.parse(responseBody);
      return jsonResponse.choices[0].message.content;
    } else {
      console.error(`API Error: ${responseCode} - ${responseBody}`);
      return null;
    }
  } catch (e) {
    console.error('Error calling OpenRouter API:', e.toString());
    return null;
  }
}

/**
 * Analyzes the email content to extract key information.
 */
function analyzeEmail(message) {
  const subject = message.getSubject();
  const body = message.getPlainBody();
  const sender = message.getFrom();
  const senderName = sender.split('<')[0].trim() || sender.split('@')[0];

  return {
    sender: senderName,
    senderEmail: sender,
    subject: subject,
    body: body,
    asks: extractAsks(body),
    actionItems: extractActionItems(body),
    urgency: detectUrgency(body, subject),
    hasAttachments: message.getAttachments().length > 0
  };
}

/**
 * Extracts asks/requests from email content.
 */
function extractAsks(body) {
  const asks = [];
  const askPatterns = [
    /can you (.*?)[\.\?\!]/gi, /could you (.*?)[\.\?\!]/gi, /would you (.*?)[\.\?\!]/gi,
    /please (.*?)[\.\?\!]/gi, /i need (.*?)[\.\?\!]/gi, /we need (.*?)[\.\?\!]/gi,
    /requesting (.*?)[\.\?\!]/gi
  ];
  askPatterns.forEach(pattern => {
    const matches = body.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleanAsk = match.replace(/[\.\?\!]/g, '').trim();
        if (cleanAsk.length > 10 && cleanAsk.length < 200) asks.push(cleanAsk);
      });
    }
  });
  if (asks.length === 0) {
    const questions = body.split(/[\.\!]/).filter(sentence => sentence.includes('?') && sentence.trim().length > 20);
    asks.push(...questions.slice(0, 3));
  }
  return [...new Set(asks)];
}

/**
 * Extracts action items from email content.
 */
function extractActionItems(body) {
  const actions = [];
  const actionKeywords = ['review', 'approve', 'sign', 'complete', 'finish', 'send', 'submit', 'schedule', 'meet', 'call', 'discuss', 'prepare', 'draft', 'update'];
  const sentences = body.split(/[\.\!\?]/).filter(s => s.trim().length > 15);
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    if (actionKeywords.some(keyword => lowerSentence.includes(keyword))) {
      if (lowerSentence.includes('by ') || lowerSentence.includes('before ') || lowerSentence.includes('due ') || lowerSentence.includes('deadline')) {
        actions.push(sentence.trim());
      }
    }
  });
  return actions.slice(0, 5);
}

/**
 * Detects urgency level of the email.
 */
function detectUrgency(body, subject) {
  const urgentWords = ['urgent', 'asap', 'immediately', 'rush', 'critical', 'emergency'];
  const text = (body + ' ' + subject).toLowerCase();
  return urgentWords.some(word => text.includes(word)) ? 'High' : 'Normal';
}

/**
 * Detects if an email is a meeting invitation.
 */
function isMeetingInvite(message) {
  return message.getAttachments().some(attachment => {
    const contentType = attachment.getContentType();
    const fileName = attachment.getName().toLowerCase();
    return contentType === 'text/calendar' || fileName.endsWith('.ics');
  });
}

/**
 * Checks if a draft reply already exists for this thread.
 */
function hasDraftReply(thread) {
  try {
    return GmailApp.getDrafts().some(draft => draft.getMessage().getThread().getId() === thread.getId());
  } catch (error) {
    console.error('Error checking for existing drafts:', error.toString());
    return false;
  }
}

/**
 * Sets up automatic trigger to run every 15 minutes.
 */
function setupAutomaticTrigger() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'createAutomatedDrafts') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('createAutomatedDrafts').timeBased().everyMinutes(15).create();
  console.log('Automatic trigger set up successfully.');
}

/**
 * Manual trigger for testing.
 */
function testAutoDrafts() {
  console.log('Starting manual test of AI-powered draft creation...');
  createAutomatedDrafts();
  console.log('Test completed. Check your Gmail drafts.');
}
