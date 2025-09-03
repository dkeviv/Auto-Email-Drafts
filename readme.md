Automation script to create email draft
Benefits: Reduce time spent on emails, Makes sure you are not missing anything when you are out. 

Features:
Intelligent Analysis: Extracts asks, action items, and urgency
VP-Level Polish: Professional tone suitable for executive communication
Duplicate Prevention: Won't create multiple drafts for same email
Customizable: Easy to modify response templates
Automatic: Runs every 15 minutes once set up

Setup:
Step 1: Create the Apps Script Project

Go to script.google.com
Click "New Project"
Delete the default code and paste the complete code above
Save the project with name "Gmail Auto-Draft Addon"

Step 2: Set Up Permissions

Run the testAutoDrafts() function first
Grant required Gmail permissions when prompted
The script needs: Gmail read/write, Create drafts

Step 3: Enable Automation

Run the setupAutomaticTrigger() function once
This creates a trigger that runs every 15 minutes
You can modify the frequency in the setupAutomaticTrigger() function

Step 4: Test the Addon

Send yourself a test email with requests like "Can you review this proposal?"
Run testAutoDrafts() manually
Check your Gmail drafts folder for the generated reply

