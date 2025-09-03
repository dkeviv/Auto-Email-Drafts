// ========================================
// GMAIL AUTO-DRAFT REPLY ADDON (GEMINI-READY)
// ========================================

/**
 * Main function that processes emails and creates automated draft replies
 * This runs when the addon is triggered
 */
function createAutomatedDrafts() {
  try {
    // Get unread emails in inbox
    const threads = GmailApp.search('is:unread in:inbox', 0, 10);
    if (threads.length === 0) {
      console.log('No unread emails found');
      return;
    }
    
    threads.forEach(thread => {
      const messages = thread.getMessages();
      const latestMessage = messages[messages.length - 1];
      
      // Skip if it's from the user themselves
      if (latestMessage.getFrom().includes(Session.getActiveUser().getEmail())) {
        return;
      }
      
      // Skip if draft already exists for this thread
      if (hasDraftReply(thread)) {
        console.log('Draft already exists for thread: ' + thread.getFirstMessageSubject());
        return;
      }
      
      // Skip if it is a meeting invitation
      if (isMeetingInvite(latestMessage)) {
        console.log('Skipping meeting invitation: ' + thread.getFirstMessageSubject());
        return;
      }
      
      // Create automated draft
      createDraftForGemini(thread, latestMessage);
    });
  } catch (error) {
    console.error('Error in createAutomatedDrafts:', error);
  }
}

/**
 * Creates a draft containing a prompt for Gemini
 */
function createDraftForGemini(thread, message) {
  try {
    const analysis = analyzeEmail(message);
    const draftContent = generateGeminiPrompt(analysis); // <-- MODIFIED to call the new function
    
    // Create the draft
    thread.createDraftReply(draftContent, {
      subject: `[GEMINI PROMPT] ${message.getSubject()}` // Adds a clear subject to the draft
    });
    console.log('Gemini prompt draft created for: ' + thread.getFirstMessageSubject());
  } catch (error) {
    console.error('Error creating draft reply:', error);
  }
}

// ======================= NEW FUNCTION START =======================
/**
 * Generates a detailed prompt for a generative AI model like Gemini.
 */
function generateGeminiPrompt(analysis) {
  const senderFirstName = analysis.sender.split(' ')[0];

  // The instruction for the AI model
  let prompt = `**PROMPT FOR GEMINI:**
Act as a helpful, professional executive assistant. Based on the following email context, please draft a clear, concise, and professional reply. Acknowledge the key requests and action items, and adopt a proactive and helpful tone. Sign off with "[Your Name]".

---
**EMAIL CONTEXT:**

**From:** ${analysis.senderEmail}
**Subject:** "${analysis.subject.replace(/^re:\s*/i, '')}"
**Urgency Detected:** ${analysis.urgency}

`;

  // Add the identified requests to the context
  if (analysis.asks.length > 0) {
    prompt += `\n**Key Requests Identified:**\n`;
    analysis.asks.forEach((ask, index) => {
      prompt += `- ${ask}\n`;
    });
  }

  // Add the identified action items to the context
  if (analysis.actionItems.length > 0) {
    prompt += `\n**Action Items Identified:**\n`;
    analysis.actionItems.forEach((action, index) => {
      prompt += `- ${action}\n`;
    });
  }
  
  prompt += `\n---
**DRAFT THE REPLY BELOW:**`;

  return prompt;
}
// ======================= NEW FUNCTION END =========================

// (The rest of your functions: analyzeEmail, extractAsks, hasDraftReply, etc., remain the same)
// ... paste all the other unchanged functions from the previous script here ...

/**
 * Analyzes the email content to extract key information
 */
function analyzeEmail(message) {
  const subject = message.getSubject();
  const body = message.getPlainBody();
  const sender = message.getFrom();
  
  // Extract sender name (remove email address)
  const senderName = sender.split('<')[0].trim() || sender.split('@')[0];
  
  // Analyze content for asks, action items, and context
  const analysis = {
    sender: senderName,
    senderEmail: sender,
    subject: subject,
    body: body,
    asks: extractAsks(body),
    actionItems: extractActionItems(body),
    urgency: detectUrgency(body, subject),
    meetingRequest: detectMeetingRequest(body),
    hasAttachments: message.getAttachments().length > 0
  };
  return analysis;
}

/**
 * Extracts asks/requests from email content
 */
function extractAsks(body) {
  const asks = [];
  const lowerBody = body.toLowerCase();
  
  // Common request patterns
  const askPatterns = [
    /can you (.*?)[\.\?\!]/gi,
    /could you (.*?)[\.\?\!]/gi,
    /would you (.*?)[\.\?\!]/gi,
    /please (.*?)[\.\?\!]/gi,
    /i need (.*?)[\.\?\!]/gi,
    /we need (.*?)[\.\?\!]/gi,
    /requesting (.*?)[\.\?\!]/gi
  ];
  askPatterns.forEach(pattern => {
    const matches = body.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const cleanAsk = match.replace(/[\.\?\!]/g, '').trim();
        if (cleanAsk.length > 10 && cleanAsk.length < 200) {
          asks.push(cleanAsk);
        }
      });
    }
  });
  // If no specific asks found, look for question marks
  if (asks.length === 0) {
    const questions = body.split(/[\.\!]/).filter(sentence => 
      sentence.includes('?') && sentence.trim().length > 20
    );
    asks.push(...questions.slice(0, 3));
  }
  
  return [...new Set(asks)]; // Remove duplicates
}

/**
 * Extracts action items from email content
 */
function extractActionItems(body) {
  const actions = [];
  
  // Look for action-oriented language
  const actionKeywords = [
    'review', 'approve', 'sign', 'complete', 'finish', 'send', 'submit',
    'schedule', 'meet', 'call', 'discuss', 'prepare', 'draft', 'update'
  ];
  const sentences = body.split(/[\.\!\?]/).filter(s => s.trim().length > 15);
  
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    if (actionKeywords.some(keyword => lowerSentence.includes(keyword))) {
      if (lowerSentence.includes('by ') || lowerSentence.includes('before ') || 
          lowerSentence.includes('due ') || lowerSentence.includes('deadline')) {
        actions.push(sentence.trim());
      }
    }
  });
  return actions.slice(0, 5); // Limit to 5 most relevant
}

/**
 * Detects urgency level of the email
 */
function detectUrgency(body, subject) {
  const urgentWords = ['urgent', 'asap', 'immediately', 'rush', 'critical', 'emergency'];
  const text = (body + ' ' + subject).toLowerCase();
  
  return urgentWords.some(word => text.includes(word)) ? 'High' : 'Normal';
}

/**
 * Detects if email contains meeting request
 */
function detectMeetingRequest(body) {
  const meetingKeywords = ['meeting', 'call', 'discussion', 'sync', 'catchup', 'schedule'];
  const lowerBody = body.toLowerCase();
  
  return meetingKeywords.some(keyword => lowerBody.includes(keyword));
}

/**
 * Detects if an email is a meeting invitation by checking for .ics attachments.
 */
function isMeetingInvite(message) {
  const attachments = message.getAttachments();
  if (attachments.length === 0) {
    return false;
  }
  
  return attachments.some(attachment => {
    const contentType = attachment.getContentType();
    const fileName = attachment.getName().toLowerCase();
    
    // Standard way to identify calendar invites
    return contentType === 'text/calendar' || fileName.endsWith('.ics');
  });
}

/**
 * Checks if a draft reply already exists for this thread
 */
function hasDraftReply(thread) {
  try {
    const drafts = GmailApp.getDrafts();
    return drafts.some(draft => {
      const draftThread = draft.getMessage().getThread();
      return draftThread.getId() === thread.getId();
    });
  } catch (error) {
    console.error('Error checking for existing drafts:', error);
    return false;
  }
}

/**
 * Sets up automatic trigger to run every 15 minutes
 * Run this once to set up automation
 */
function setupAutomaticTrigger() {
  // Delete existing triggers
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'createAutomatedDrafts') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  // Create new trigger
  ScriptApp.newTrigger('createAutomatedDrafts')
    .timeBased()
    .everyMinutes(15)
    .create();
  console.log('Automatic trigger set up successfully');
}

/**
 * Manual trigger for testing
 * Run this to test the addon manually
 */
function testAutoDrafts() {
  console.log('Starting manual test of auto-draft creation...');
  createAutomatedDrafts();
  console.log('Test completed. Check your Gmail drafts.');
}
