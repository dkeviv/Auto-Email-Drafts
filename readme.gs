Use code2.gs when you don't can't use API.

A Practical 2-Step Workflow 🤝
Here’s how the new workflow will function:

1. The Script Analyzes & Creates a Prompt: The updated script will run as before, but instead of creating a generic, template-based reply, it will create a draft containing a detailed summary and a ready-to-use prompt for Gemini.
2. You Use the Gemini Chat Agent: You'll simply copy the entire content of that draft, paste it into your Gemini chat, and get a high-quality, AI-generated response to then paste back into your email.

Now, when the script runs on an email, the draft it creates in your Gmail will look like this:

Subject: [GEMINI PROMPT] Re: Project Phoenix Proposal Review

PROMPT FOR GEMINI:
Act as a helpful, professional executive assistant. Based on the following email context, please draft a clear, concise, and professional reply. Acknowledge the key requests and action items, and adopt a proactive and helpful tone. Sign off with "[Your Name]".

EMAIL CONTEXT:

From: Jane Doe j.doe@example.com
Subject: "Project Phoenix Proposal Review"
Urgency Detected: High

Key Requests Identified:

can you review the attached proposal by EOD tomorrow

I need your feedback on the budget section specifically

Action Items Identified:

Please review the proposal for the Phoenix project due by tomorrow

DRAFT THE REPLY BELOW:

