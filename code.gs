// ========================================
// GMAIL AUTO-DRAFT REPLY ADDON
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
      
      // Create automated draft
      createDraftReply(thread, latestMessage);
    });
    
  } catch (error) {
    console.error('Error in createAutomatedDrafts:', error);
  }
}

/**
 * Creates a professional draft reply for a given email
 */
function createDraftReply(thread, message) {
  try {
    const analysis = analyzeEmail(message);
    const draftContent = generateDraftReply(analysis, message);
    
    // Create the draft
    thread.createDraftReply(draftContent);
    console.log('Draft created for: ' + thread.getFirstMessageSubject());
    
  } catch (error) {
    console.error('Error creating draft reply:', error);
  }
}

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
  const lowerBody = body.toLowerCase();
  
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
 * Generates professional draft reply content
 */
function generateDraftReply(analysis, originalMessage) {
  const senderFirstName = analysis.sender.split(' ')[0];
  
  let draft = `Dear ${senderFirstName},\n\n`;
  draft += `Thank you for your email regarding "${analysis.subject.replace(/^re:\s*/i, '')}".\n\n`;
  
  // Acknowledge the asks
  if (analysis.asks.length > 0) {
    draft += `**Key Requests Identified:**\n`;
    analysis.asks.forEach((ask, index) => {
      draft += `${index + 1}. ${ask}\n`;
    });
    draft += `\n`;
  }
  
  // List action items
  if (analysis.actionItems.length > 0) {
    draft += `**Action Items:**\n`;
    analysis.actionItems.forEach((action, index) => {
      draft += `${index + 1}. ${action}\n`;
    });
    draft += `\n`;
  }
  
  // Suggested response based on content analysis
  draft += `**Proposed Response:**\n`;
  
  if (analysis.urgency === 'High') {
    draft += `I understand this is time-sensitive and will prioritize accordingly. `;
  }
  
  if (analysis.meetingRequest) {
    draft += `I'm available for a discussion and will coordinate with my calendar to find a suitable time. `;
  }
  
  if (analysis.asks.length > 0) {
    draft += `I will review the requested items and provide a comprehensive response by [INSERT TIMELINE]. `;
  }
  
  if (analysis.hasAttachments) {
    draft += `I will also review the attached documents and incorporate any relevant information in my response. `;
  }
  
  draft += `Please let me know if you need any clarification or if there are additional priorities I should consider.\n\n`;
  
  // Professional closing
  draft += `Best regards,\n`;
  draft += `[Your Name]\n`;
  draft += `[Your Title]\n\n`;
  
  // Add metadata for reference
  draft += `---\n`;
  draft += `*This draft was automatically generated for efficiency. Please review and customize before sending.*\n`;
  draft += `*Original sender: ${analysis.senderEmail}*\n`;
  draft += `*Urgency level: ${analysis.urgency}*`;
  
  return draft;
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

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Clean up old triggers (maintenance function)
 */
function cleanupTriggers() {
  ScriptApp.getProjectTriggers().forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  console.log('All triggers cleaned up');
}

/**
 * Get addon status and statistics
 */
function getAddonStatus() {
  const triggers = ScriptApp.getProjectTriggers();
  const activeTrigger = triggers.find(t => t.getHandlerFunction() === 'createAutomatedDrafts');
  
  console.log('=== ADDON STATUS ===');
  console.log('Active triggers:', triggers.length);
  console.log('Auto-draft trigger active:', !!activeTrigger);
  
  if (activeTrigger) {
    console.log('Trigger type:', activeTrigger.getEventType());
  }
  
  // Count recent drafts
  const recentDrafts = GmailApp.getDrafts().filter(draft => {
    const created = draft.getMessage().getDate();
    const oneDayAgo = new Date(Date.now() - 24*60*60*1000);
    return created > oneDayAgo;
  });
  
  console.log('Drafts created in last 24h:', recentDrafts.length);
}
